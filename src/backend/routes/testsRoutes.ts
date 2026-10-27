import { Router } from 'express';
import { db } from '../db.ts';
import { WeeklyTest, TestResult } from '../types.ts';
import { generateWhatsAppLink, interpolateTemplate, normalizeBdPhoneNumber } from '../whatsappHelper.ts';

export const testsRouter = Router();

// 1. List all tests with filtering
testsRouter.get('/', (req, res) => {
  const { classBatchId, subject } = req.query;
  const state = db.getState();

  let list = state.tests.filter((t) => t.status !== 'archived');
  if (classBatchId && classBatchId !== 'all') {
    list = list.filter((t) => t.classBatchId === classBatchId);
  }
  if (subject && subject !== 'all') {
    list = list.filter((t) => t.subject === subject);
  }

  // Enrich with participant count, average marks, highest marks
  const enriched = list.map((t) => {
    const results = state.testResults.filter((r) => r.testId === t.id);
    const count = results.length;
    const highest = count > 0 ? Math.max(...results.map((r) => r.obtainedMarks)) : 0;
    const lowest = count > 0 ? Math.min(...results.map((r) => r.obtainedMarks)) : 0;
    const avg = count > 0 ? Math.round((results.reduce((s, r) => s + r.obtainedMarks, 0) / count) * 10) / 10 : 0;

    return {
      ...t,
      participantCount: count,
      highestMarks: highest,
      lowestMarks: lowest,
      averageMarks: avg,
      averagePercentage: t.maxMarks > 0 ? Math.round((avg / t.maxMarks) * 1000) / 10 : 0,
    };
  });

  res.json({ tests: enriched });
});

// 2. Create new weekly test
testsRouter.post('/', (req, res) => {
  try {
    const { title, classBatchId, subject, testDate, maxMarks } = req.body;
    const state = db.getState();

    if (!title || !classBatchId || !subject || !testDate || !maxMarks) {
      return res.status(400).json({ error: 'All fields (title, classBatchId, subject, testDate, maxMarks) are required' });
    }

    const batch = state.batches.find((b) => b.id === classBatchId);
    if (!batch) return res.status(404).json({ error: 'Class batch not found' });

    const maxMarksNum = Number(maxMarks);
    if (isNaN(maxMarksNum) || maxMarksNum <= 0) {
      return res.status(400).json({ error: 'Maximum marks must be a positive number' });
    }

    const newTest: WeeklyTest = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      classBatchId,
      classBatchName: batch.name,
      subject: subject.trim(),
      testDate,
      maxMarks: maxMarksNum,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    state.tests.unshift(newTest);

    // Initialize blank results for all enrolled students in this batch
    const enrolledStudents = state.students.filter(
      (s) => s.classBatchId === classBatchId && s.status === 'active'
    );

    for (const student of enrolledStudents) {
      const result: TestResult = {
        id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        testId: newTest.id,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        obtainedMarks: 0,
        maxMarks: maxMarksNum,
        percentage: 0,
        rank: 1,
        reportPublished: false,
        createdAt: new Date().toISOString(),
      };
      state.testResults.push(result);
    }

    db.save();

    db.logAudit(
      'Teacher',
      'Teacher',
      'CREATE_TEST',
      'WeeklyTest',
      newTest.id,
      `Created test "${newTest.title}" for ${batch.name} (Max Marks: ${maxMarksNum})`
    );

    res.status(201).json({ success: true, test: newTest });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Get single test details with results, ranks, class stats
testsRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const state = db.getState();

  const test = state.tests.find((t) => t.id === id);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  // Ensure rankings are up to date
  db.recalculateTestRanks(test.id);

  const results = state.testResults
    .filter((r) => r.testId === test.id)
    .sort((a, b) => a.rank - b.rank || a.rollNo - b.rollNo);

  const count = results.length;
  const highestMarks = count > 0 ? Math.max(...results.map((r) => r.obtainedMarks)) : 0;
  const lowestMarks = count > 0 ? Math.min(...results.map((r) => r.obtainedMarks)) : 0;
  const avg = count > 0 ? Math.round((results.reduce((s, r) => s + r.obtainedMarks, 0) / count) * 10) / 10 : 0;

  // Calculate progress vs previous test in same batch & subject
  const previousTest = state.tests
    .filter((t) => t.classBatchId === test.classBatchId && t.subject === test.subject && t.testDate < test.testDate)
    .sort((a, b) => b.testDate.localeCompare(a.testDate))[0];

  const enrichedResults = results.map((r) => {
    let progressDelta = null;
    if (previousTest) {
      const prevResult = state.testResults.find((pr) => pr.testId === previousTest.id && pr.studentId === r.studentId);
      if (prevResult) {
        progressDelta = Math.round((r.percentage - prevResult.percentage) * 10) / 10;
      }
    }
    return {
      ...r,
      progressDelta,
      previousTestTitle: previousTest?.title,
    };
  });

  res.json({
    test,
    statistics: {
      totalStudents: count,
      highestMarks,
      lowestMarks,
      averageMarks: avg,
      averagePercentage: test.maxMarks > 0 ? Math.round((avg / test.maxMarks) * 1000) / 10 : 0,
      passingCount: results.filter((r) => r.percentage >= 40).length,
    },
    results: enrichedResults,
  });
});

// 4. Update marks and feedback for students in test
testsRouter.post('/:id/marks', (req, res) => {
  try {
    const { id } = req.params;
    const { entries, publishStatus } = req.body; // entries: Array<{ studentId, obtainedMarks, feedback }>
    const state = db.getState();

    const test = state.tests.find((t) => t.id === id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries must be an array of student marks' });
    }

    // Validate marks before applying
    for (const item of entries) {
      const m = Number(item.obtainedMarks);
      if (isNaN(m) || m < 0) {
        return res.status(400).json({ error: `Marks for student cannot be negative (provided: ${item.obtainedMarks})` });
      }
      if (m > test.maxMarks) {
        return res.status(400).json({
          error: `Marks for student cannot exceed test maximum marks of ${test.maxMarks} (provided: ${m})`,
        });
      }
    }

    // Apply updates
    for (const item of entries) {
      let result = state.testResults.find((r) => r.testId === test.id && r.studentId === item.studentId);
      const student = state.students.find((s) => s.id === item.studentId);
      if (!student) continue;

      if (!result) {
        result = {
          id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          testId: test.id,
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          obtainedMarks: Number(item.obtainedMarks),
          maxMarks: test.maxMarks,
          percentage: 0,
          rank: 1,
          feedback: item.feedback,
          reportPublished: publishStatus === 'published' || test.status === 'published',
          createdAt: new Date().toISOString(),
        };
        state.testResults.push(result);
      } else {
        result.obtainedMarks = Number(item.obtainedMarks);
        result.feedback = item.feedback !== undefined ? item.feedback : result.feedback;
        if (publishStatus) {
          result.reportPublished = publishStatus === 'published';
        }
      }
    }

    if (publishStatus) {
      test.status = publishStatus;
    }

    // Recalculate ranks (Standard Competition Ranking 1224)
    db.recalculateTestRanks(test.id);
    db.save();

    db.logAudit(
      'Teacher',
      'Teacher',
      'UPDATE_MARKS',
      'WeeklyTest',
      test.id,
      `Updated marks and calculated ranks for test "${test.title}"`
    );

    res.json({ success: true, test, message: 'Marks and rankings successfully updated.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. WhatsApp Test Result Link Generator (Single)
testsRouter.post('/whatsapp-result', (req, res) => {
  try {
    const { testId, studentId, includeReportUrl = true } = req.body;
    const state = db.getState();

    const test = state.tests.find((t) => t.id === testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (test.status !== 'published') {
      return res.status(400).json({
        error: 'Test reports can only be shared with parents after the test has been published by the teacher.',
      });
    }

    const result = state.testResults.find((r) => r.testId === testId && r.studentId === studentId);
    if (!result) return res.status(404).json({ error: 'Student test result not found' });

    // Host app url
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const reportUrl = `${appUrl}?view=report&testId=${test.id}&studentId=${studentId}`;

    let template =
      state.templates.find((t) => t.type === 'test_report')?.templateText ||
      'Hello, {{parent_name}}. The weekly test report for {{student_name}} is ready. Marks: {{obtained_marks}}/{{maximum_marks}}. Percentage: {{percentage}}%. Rank: {{rank}}. Please check the report link for detailed feedback: {{report_url}}';

    if (!includeReportUrl) {
      // Remove sentence referencing report link
      template = template.replace(/Please check the report link.*$/i, '').trim();
    }

    const message = interpolateTemplate(template, {
      parent_name: result.parentName,
      student_name: result.studentName,
      obtained_marks: result.obtainedMarks,
      maximum_marks: result.maxMarks,
      percentage: result.percentage,
      rank: result.rank,
      report_url: reportUrl,
    });

    const linkResult = generateWhatsAppLink(result.parentPhone, message);
    if (!linkResult.success) {
      return res.status(400).json({ error: linkResult.error });
    }

    res.json({
      success: true,
      url: linkResult.url,
      message,
      normalizedPhone: linkResult.normalizedPhone,
      studentName: result.studentName,
      parentName: result.parentName,
      rank: result.rank,
      percentage: result.percentage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Single Student Printable Report Card
testsRouter.get('/report-card/:testId/:studentId', (req, res) => {
  const { testId, studentId } = req.params;
  const state = db.getState();

  const test = state.tests.find((t) => t.id === testId);
  const result = state.testResults.find((r) => r.testId === testId && r.studentId === studentId);
  const student = state.students.find((s) => s.id === studentId);
  const batch = state.batches.find((b) => b.id === test?.classBatchId);
  const settings = state.settings;

  if (!test || !result || !student) {
    return res.status(404).json({ error: 'Report card data not found' });
  }

  // Summary statistics for context
  const testResults = state.testResults.filter((r) => r.testId === testId);
  const highestMarks = Math.max(...testResults.map((r) => r.obtainedMarks));
  const avgMarks = Math.round((testResults.reduce((s, r) => s + r.obtainedMarks, 0) / testResults.length) * 10) / 10;

  res.json({
    test,
    result,
    student,
    batch,
    settings,
    context: {
      totalParticipants: testResults.length,
      highestMarks,
      averageMarks: avgMarks,
      averagePercentage: Math.round((avgMarks / test.maxMarks) * 1000) / 10,
    },
  });
});

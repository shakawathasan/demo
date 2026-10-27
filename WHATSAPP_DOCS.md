# WhatsApp Integration & Message Templates Documentation

ShikhoTuition BD implements an automatic, personalized WhatsApp messaging workflow using the official **free WhatsApp Click-to-Chat API**. No paid WhatsApp API, Meta developer credentials, or subscription services are required.

---

## 1. URL Architecture

The application constructs universal WhatsApp click-to-chat links according to the specification:
```
https://wa.me/8801XXXXXXXXX?text=URL_ENCODED_MESSAGE
```

### Bangladeshi Phone Number Normalization
Any raw Bangladeshi mobile number entered by a parent or teacher is automatically normalized into the international 13-digit format (`8801XXXXXXXXX`):
- Handles standard local formats: `01711223344`, `+8801711223344`, `8801711223344`, `1711223344`.
- Validates operator prefixes: GP (`013`, `017`), Banglalink (`014`, `019`), Teletalk (`015`), Robi/Airtel (`016`, `018`).
- Cleans whitespace, dashes, and parentheses.
- Rejects invalid phone numbers with clear, user-friendly error messages.

---

## 2. Dynamic Template Variables

Templates are centrally configured in Admin Panel > **WhatsApp Templates** and support the following dynamic variables:

| Variable | Description | Example Replacement |
| :--- | :--- | :--- |
| `{{parent_name}}` | Name of parent or legal guardian | Abdul Karim |
| `{{student_name}}` | Name of enrolled student | Tanvir Ahmed Karim |
| `{{class_name}}` | Class or batch title | Class 10 - Science Morning |
| `{{fee_month}}` | Target academic month | October 2026 |
| `{{outstanding_amount}}` | Current pending fee in BDT | ৳2,500 |
| `{{attendance_date}}` | Date of recorded absence | 2026-10-26 |
| `{{obtained_marks}}` | Marks scored by student in weekly test | 47 |
| `{{maximum_marks}}` | Maximum test marks | 50 |
| `{{percentage}}` | Computed percentage | 94.0% |
| `{{rank}}` | Competition rank (1224) | Rank #1 |
| `{{report_url}}` | Link to student performance card | `http://localhost:3000?view=report...` |

---

## 3. Core Message Templates

### A. Fee Reminder Template
```text
Hello, {{parent_name}}. This is a friendly reminder that the tuition fee of {{student_name}} for {{fee_month}} is still pending. Outstanding amount: ৳{{outstanding_amount}}. Please let us know once payment is completed. Thank you.
```

### B. Daily Absence Alert Template
```text
Hello, {{parent_name}}. {{student_name}} was marked absent from {{class_name}} on {{attendance_date}}. Please contact us if you need any clarification.
```

### C. Weekly Test Result Template
```text
Hello, {{parent_name}}. The weekly test report for {{student_name}} is ready. Marks: {{obtained_marks}}/{{maximum_marks}}. Percentage: {{percentage}}%. Rank: {{rank}}. Please check the report link for detailed feedback: {{report_url}}
```

---

## 4. Bulk WhatsApp Wizard Workflow

When issuing bulk fee reminders or batch absence alerts:
1. **Validation**: Validates phone numbers and excludes fully paid students or present/leave students.
2. **Preview**: Displays the recipient list and count before proceeding.
3. **Step-by-Step Runner**: Allows the teacher to review the pre-filled message, tap **Open WhatsApp Chat**, and press Send inside WhatsApp.
4. **Convenience**: Provides a **Next Recipient** and **Skip** control.
5. **Truth in Delivery**: Opening WhatsApp records `whatsapp_opened` or `manually_confirmed`. The system strictly never falsely claims a message was "Delivered" without actual carrier/server feedback.

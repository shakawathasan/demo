import { Router, Request, Response, NextFunction } from 'express';
import { db, verifyPassword, hashPassword, createSession, validateSession, destroySession, ActiveSession } from '../db.ts';

export const authRouter = Router();

// Middleware to enforce Admin Authorization on any route
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const session = validateSession(authHeader);

  if (!session) {
    return res.status(401).json({ error: 'Authentication required. Please log in as Administrator.' });
  }

  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden: Administrative privileges required.' });
  }

  (req as any).user = session;
  next();
}

// Middleware for general authenticated session
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const session = validateSession(authHeader);

  if (!session) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  (req as any).user = session;
  next();
}

// 1. Secure Admin Login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const state = db.getState();
    const cleanEmail = email.trim().toLowerCase();
    const user = state.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If user has a passwordHash, verify it with PBKDF2
    if (user.passwordHash && user.passwordSalt) {
      const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      // If legacy user without password, only allow if password matches verified setup password
      if (password !== 'Admin@2026#BD') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      // Migrate password to secure hash
      const { hash, salt } = hashPassword(password);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      db.save();
    }

    // Create session token
    const session = createSession(user);

    db.logAudit(user.id, user.name, 'ADMIN_LOGIN', 'Auth', session.token.slice(0, 10), `Admin ${user.name} logged in successfully`);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      linkedStudentIds: user.linkedStudentIds,
    };

    res.json({
      success: true,
      user: safeUser,
      token: session.token,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication service error' });
  }
});

// 2. Check current authenticated user
authRouter.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const session = validateSession(authHeader);

  if (!session) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const state = db.getState();
  const user = state.users.find((u) => u.id === session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      linkedStudentIds: user.linkedStudentIds,
    },
    isAdmin: user.role === 'admin',
  });
});

// 2b. Public tuition branding & settings
authRouter.get('/branding', (req, res) => {
  const state = db.getState();
  res.json({ settings: state.settings });
});

// 3. Secure Logout
authRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  destroySession(authHeader);
  res.json({ success: true, message: 'Logged out successfully' });
});

// 4. Change Admin Password
authRouter.post('/change-password', requireAdminAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const session = (req as any).user as ActiveSession;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.id === session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (user.passwordHash && user.passwordSalt) {
      const isMatch = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    db.save();

    db.logAudit(user.id, user.name, 'PASSWORD_CHANGE', 'User', user.id, 'Administrator updated account password');

    res.json({ success: true, message: 'Password changed successfully. Please keep your new password safe.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Parent Lookup (Public Portal helper)
authRouter.post('/parent-lookup', (req, res) => {
  const { studentIdOrPhone } = req.body;
  if (!studentIdOrPhone) {
    return res.status(400).json({ error: 'Please enter Student ID or Parent Phone number' });
  }

  const query = studentIdOrPhone.trim().toLowerCase();
  const state = db.getState();

  const matchedStudent = state.students.find(
    (s) =>
      s.status !== 'archived' &&
      (s.studentId.toLowerCase() === query ||
        s.parentPhone.replace(/[\s-]/g, '') === query.replace(/[\s-]/g, ''))
  );

  if (!matchedStudent) {
    return res.status(404).json({ error: 'No student found with the provided ID or Phone number' });
  }

  res.json({
    success: true,
    student: {
      id: matchedStudent.id,
      studentId: matchedStudent.studentId,
      name: matchedStudent.name,
      classBatchName: matchedStudent.classBatchName,
      parentName: matchedStudent.parentName,
      parentPhone: matchedStudent.parentPhone,
    },
  });
});

// 6. Safe public users list for demo/portal
authRouter.get('/users', (req, res) => {
  const state = db.getState();
  const safeUsers = state.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    linkedStudentIds: u.linkedStudentIds,
  }));
  res.json({ users: safeUsers });
});

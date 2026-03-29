import jwt from 'jsonwebtoken';

export const authRedirectMW = (req, res, next) => {
  const token = req.session.token;// = token;
  // const token = req.header('Authorization');
  if (!token) return res.redirect('login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect('login');
    // res.status(400).json({ message: 'Invalid token' });
  }
};

export const authMW = (req, res, next) => {
  const token = req.session.token;
  // const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

export const roleMW = (requiredRole) => (req, res, next) => {
  if (req.user.role !== requiredRole) return res.status(403).json({ message: 'Access forbidden' });
  next();
};
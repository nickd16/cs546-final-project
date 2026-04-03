import jwt from 'jsonwebtoken';

export const authRedirectMW = (req, res, next) => {
  const token = req.session.token;// = token;
  // const token = req.header('Authorization');
  console.log('[authRedirectMW]', req.method, req.originalUrl || req.url, 'hasToken=', Boolean(token));
  if (!token) {
    console.log('[authRedirectMW] no session token, redirect /login');
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('[authRedirectMW] jwt ok, next()');
    next();
  } catch (err) {
    console.log('[authRedirectMW] jwt verify failed', err.message, 'redirect /login');
    return res.redirect('/login');
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

export const isAdminMW = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Access forbidden' }); // return res.redirect('login');
  next();
};
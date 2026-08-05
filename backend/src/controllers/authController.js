const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, toPublicUser } = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'boarding-house-secret';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  try {
    const { fullName, email, password, role = 'visitor' } = req.body;
    const allowedRoles = ['visitor', 'landlord'];

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email, and password are required' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Allowed values are visitor or landlord' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await createUser({ fullName, email, password, role });
    const token = signToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.status(200).json({
      message: 'Login successful',
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
}

module.exports = {
  register,
  login,
};

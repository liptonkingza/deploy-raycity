const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

let cachedClient = null;

async function connectToDatabase(uri) {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;

    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ success:false, message:'Missing username or password' }) };
    }

    const client = await connectToDatabase(process.env.MONGODB_URI);
    const db = client.db(process.env.MONGODB_DB || 'raycity');
    const users = db.collection('users');

    const user = await users.findOne({ username });
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ success:false, message:'Invalid credentials' }) };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return { statusCode: 401, body: JSON.stringify({ success:false, message:'Invalid credentials' }) };
    }

    const token = jwt.sign({ username: user.username, sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const headers = {
      'Set-Cookie': cookie.serialize('rc_token', token, {
        httpOnly: true,
        secure: process.env.NETLIFY && process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      }),
      'Content-Type': 'application/json'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success:true, message:'Logged in', username: user.username })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success:false, message:'Server error' }) };
  }
};

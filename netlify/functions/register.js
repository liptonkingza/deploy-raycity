const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

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

    const existing = await users.findOne({ username });
    if (existing) {
      return { statusCode: 409, body: JSON.stringify({ success:false, message:'Username already exists' }) };
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await users.insertOne({ username, passwordHash: hash, createdAt: new Date() });

    return {
      statusCode: 200,
      body: JSON.stringify({ success:true, message:'User created' })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success:false, message:'Server error' }) };
  }
};

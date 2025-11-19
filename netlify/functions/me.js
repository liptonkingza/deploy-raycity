const jwt = require('jsonwebtoken');
const cookie = require('cookie');

exports.handler = async function(event, context) {
  try {
    const cookieHeader = event.headers && (event.headers.cookie || event.headers.Cookie || '');
    if (!cookieHeader) {
      return { statusCode: 200, body: JSON.stringify({ authenticated: false }) };
    }

    const parsed = cookie.parse(cookieHeader || '');
    const token = parsed.rc_token;
    if (!token) {
      return { statusCode: 200, body: JSON.stringify({ authenticated: false }) };
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return { statusCode: 200, body: JSON.stringify({ authenticated: true, user: { username: payload.username } }) };
    } catch (e) {
      return { statusCode: 200, body: JSON.stringify({ authenticated: false }) };
    }
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ authenticated: false }) };
  }
};

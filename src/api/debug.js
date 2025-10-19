// A temporary, secure endpoint for debugging environment variables.
// DELETE THIS FILE AFTER DEBUGGING IS COMPLETE.
export default function handler(req, res) {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret) {
      // Log the secret and its length to the private server logs
      console.log('--- JWT_SECRET DEBUG ---');
      console.log(`The secret is: "${jwtSecret}"`);
      console.log(`Secret length: ${jwtSecret.length}`);
      console.log('--- END JWT_SECRET DEBUG ---');
      res.status(200).json({ success: true, message: "JWT_SECRET has been logged to your private Vercel server logs. Please check the 'Logs' tab." });
    } else {
      console.log('--- JWT_SECRET DEBUG ---');
      console.log('The JWT_SECRET environment variable is NOT SET on the server.');
      console.log('--- END JWT_SECRET DEBUG ---');
      res.status(404).json({ success: false, message: "JWT_SECRET is not set. Check the Vercel server logs." });
    }

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ success: false, message: 'Server error in debug endpoint.' });
  }
}

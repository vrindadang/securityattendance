export default async function handler(req, res) {
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
        },
      }
    );

    return res.status(200).json({
      success: true,
      status: response.status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

import { NextResponse } from "next/server";

export async function GET() {
  const body = `<!DOCTYPE html>
<html>
<head><title>Reset</title></head>
<body>
<script>
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('wechatSyncDraft') || key.includes('factory') || key.includes('persist')) {
        localStorage.removeItem(key);
      }
    });
  } catch(e) {}
  location.href = '/';
</script>
<p>Resetting...</p>
</body>
</html>`;

  return new NextResponse(body, {
    headers: { "Content-Type": "text/html" },
  });
}

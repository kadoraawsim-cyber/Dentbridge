export async function GET() {
  return new Response(
    [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>Student Pilot Closed</title>',
      '</head>',
      '<body>',
      '<main style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5;">',
      '<h1>Student pilot form closed</h1>',
      '<p>The DentBridge student pilot application form is no longer active.</p>',
      '</main>',
      '</body>',
      '</html>',
    ].join(''),
    {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}

const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch("https://mkyqzinteimagjerzfvz.supabase.co/functions/v1/push-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "MANUAL",
        table: "manual",
        manual_data: {
          title: "Teste",
          message: "Teste debug",
          cargo: "ADMIN"
        }
      })
    });
    
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);
  } catch (err) {
    console.error(err);
  }
}

test();

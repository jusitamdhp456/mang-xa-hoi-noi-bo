const form = new FormData();
form.append('name', 'My Company');

fetch('http://localhost:3000/onboarding', {
  method: 'POST',
  headers: {
    'Next-Action': '12345', 
  },
  body: form
}).then(async res => {
  console.log(res.status);
  console.log(await res.text());
}).catch(console.error);

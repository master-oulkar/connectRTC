 // get an email from input and send to the server, return response from server
 document.getElementById('send-email').addEventListener('submit', async (e) => {
    e.preventDefault()
    let response = await fetch('/send_email/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf('csrftoken'),
      },
      mode: 'same-origin',
      body: JSON.stringify({
        'email': document.getElementById('from_email').value,
      })
    })
    let msg = await response.json()
    document.querySelector('.msg').innerHTML = msg.message;
    // document.querySelector('#mail').innerHTML = msg.email;
  })

  // get code from input and send to server and return response from the server
  document.getElementById('verify-code').addEventListener('submit', async (e) => {
    e.preventDefault()
   
    let response = await fetch('/verify_code/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf('csrftoken'),
      },
      mode: 'same-origin',
      body: JSON.stringify({
        'code': document.getElementById('code').value,
        'email': document.querySelector('#mail').innerHTML,
      })
    })
    let msg = await response.json()
    document.querySelector('#msg').innerHTML = msg.message;
  })

  // get password and send to server, return response from server
  document.getElementById('reset-password').addEventListener('submit', async (e) => {
    e.preventDefault()
    let response = await fetch('/reset_password/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf('csrftoken'),
      },
      mode: 'same-origin',
      body: JSON.stringify({
        'password': document.getElementById('confirmation').value,
        'email': document.querySelector('#mail').innerHTML,
      })
    })
    let msg = await response.json()
    document.querySelector('#msg').innerHTML = msg.message;
  })


// Get csrf token 
function getCsrf(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
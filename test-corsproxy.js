fetch('https://corsproxy.io/?url=' + encodeURIComponent('https://script.google.com/macros/s/AKfycbz1E-CxMWgT9UhmlIh8LJb5wRmJEQZ3Y7mwpqbFjQtfuoV1U4vTjISMq0gDKPv6VWYu/exec'), {
  headers: {
    'Origin': 'http://localhost:3002',
    'User-Agent': 'Mozilla/5.0'
  }
}).then(r => r.text()).then(console.log).catch(console.error)

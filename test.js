var twitter = require('twit');
console.log("Nemam Amma Bhagavan Sharanam");
client  = new twitter({ consumer_key: "W4BsbvQJdEZtg27W0sAfAg",
           consumer_secret: "3zbIFGQJv5QZyyWCGjUXiQzygnyV3P4YW3W3DFkpP0U",
           access_token: "1724608555-R3MbqVjAatPIRFC3THNglH3BLOfO6MAjHlUW8nB",
           access_token_secret: "IliBzpicbMOwo6BFVcOOxul3jUzDTE3nwPGqdSJFqybra",
          });

console.log("Nemam Amma Bhagavan Sharanam -- Running Search");
client.get('search/tweets', { q: 'putoutyourbats since:2011-11-11', count: 100 }, function(err, data, response) {
  console.log("Nemam Amma Bhagavan Sharanam Data is:" + Object.keys(data.statuses[0]) + data.statuses[0].text);
})


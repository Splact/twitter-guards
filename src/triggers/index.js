const fs = require('fs');


const triggers = fs.readdirSync(__dirname)
  .filter(f => f !== 'index.js')
  .map(f => ({
    language: f.split('.')[0],
    triggers: require(`./${f}`),
  }));


module.exports = triggers;

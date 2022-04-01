const path = require('path');
const fs = require('fs');
const os = require('os');
const envFilePath = path.resolve(__dirname, '../.env');

const readEnvVars = () => fs.readFileSync(envFilePath, 'utf-8').split(os.EOL);

const setEnvValue = (key, value) => {
  const envVars = readEnvVars();
  const targetLine = envVars.find(line => line.split('=')[0] === key);
  if (targetLine !== undefined) {
    // update existing line
    const targetLineIndex = envVars.indexOf(targetLine);
    // replace the key/value with the new value
    envVars.splice(targetLineIndex, 1, `${key}="${value}"`);
  } else {
    // create new key value
    envVars.push(`${key}="${value}"`);
  }
  process.env[key] = value;
  // write everything back to the file system
  fs.writeFileSync(envFilePath, envVars.join(os.EOL));
};

module.exports = {
  setEnvValue,
};

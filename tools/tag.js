/**
 * formBuilder Tag script
 */

import semver from 'semver';
import pkg from '../package.json';
import fs from 'fs';
import replace from 'replace-in-file';
import {exec} from 'child_process';
import json from 'json-update';

/**
 * Updates README AND CHANGELOG
 * @param  {Object} version current and new version
 * @return {void}
 */
function updateMd(version) {
  const lastLog = fs.readFileSync('./CHANGELOG.md', 'utf8').split('\n')[2];
  return exec('git log -1 HEAD --pretty=format:%s', function(err, gitLog) {
    gitLog = gitLog.replace(/\(#(\d+)\)/g, `[#$1](${pkg.repository.url}/pulls/$1)`);
    const changes = [
      {
        files: 'CHANGELOG.md',
        from: lastLog,
        to: `- v${version.new} - ${gitLog}\n${lastLog}`
      }, {
        files: 'README.md',
        from: new RegExp(`^${pkg.name} v\\d.\\d.\\d`),
        to: `${pkg.name} v${version.new}`
      }
    ];

    changes.forEach(change =>
      replace(change)
        .then(changedFiles => {
          console.log('Modified files:', changedFiles.join(', '));
        })
        .catch(error => {
          console.error('Error occurred:', error);
        })
    );
  });
}

/**
 * Build, push, tag and npm publish
 * @param  {String} version [description]
 * @return {Promise} exec
 */
function release(version) {
  const commands = [
    'npm run build',
    'git add --all',
    `git commit -am "v${version}"`,
    `git tag v${version}`,
    'git push origin master --tags',
    'npm publish'
  ];
  return exec(commands.join(' && '), (err, stdout) => {
    if (!err) {
      console.log(stdout);
      console.log(`Version ${version} successfully released.`);
    }
  });
}

/**
 * Modifies files, builds and tags the project
 * @return {Promise} release
 */
async function tag() {
  const args = process.argv.slice(2);
  const releaseArg = args[1] || 'patch';
  const releaseType = releaseArg.replace('--', '');
  let version = {
    current: pkg.version,
    new: semver.inc(pkg.version, releaseType)
  };

  await updateMd(version);
  await json.update('bower.json', {version: version.new});
  await json.update('package.json', {version: version.new});
  return release(version.new);
}

export default tag;

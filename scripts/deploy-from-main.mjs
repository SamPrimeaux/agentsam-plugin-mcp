#!/usr/bin/env node
/** Publish only verified code from a clean, remotely synchronized main. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const branch=git('branch','--show-current');
const sha=git('rev-parse','HEAD');
const remote=git('ls-remote','--heads','origin','main').split('\t')[0];
const dirty=git('status','--porcelain');
if (branch!=='main' || dirty || sha!==remote) {
  throw new Error('publish_requires_clean_main_synced_to_origin_main');
}
const p=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
console.log('Verified source:',sha,'service version:',p.version);
execFileSync('npm',['run','test:all'],{cwd:root,stdio:'inherit'});
if (git('status','--porcelain')) throw new Error('tests_left_dirty_tree');
const args=['wrangler','deploy','--var','GIT_SHA:'+sha,'--var','SERVICE_VERSION:'+p.version];
execFileSync('npx',args,{cwd:root,stdio:'inherit'});

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'lib', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OWNER_USERNAMES = ['2ktrey420', 'leslarel'];
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};

fs.mkdirSync(DATA_DIR, {recursive:true});
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({users:[],trialDevices:[]}, null, 2));
const normalizeUsername = raw => String(raw || '').trim().toLowerCase();
const isOwnerUsername = username => OWNER_USERNAMES.includes(normalizeUsername(username));
const isCreatorUsername = username => normalizeUsername(username) === '2ktrey420';
const hasActiveMonthlySubscription = user => Boolean(user && user.premiumUntil && new Date(user.premiumUntil) > new Date());
const hasFullAccess = user => Boolean(user && (isOwnerUsername(user.username) || hasActiveMonthlySubscription(user) || (user.trialEndsAt && new Date(user.trialEndsAt) > new Date())));
const readDb = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const writeDb = db => fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
const publicUser = user => ({id:user.id, username:user.username, owner:isOwnerUsername(user.username), creator:isCreatorUsername(user.username), fullAccess:hasFullAccess(user), trialEndsAt:user.trialEndsAt || null, price:'$10.99 / month'});
const hashPassword = password => { const salt=crypto.randomBytes(16).toString('hex'); return salt+':'+crypto.scryptSync(password,salt,64).toString('hex'); };
const verifyPassword = (password, stored) => { const [salt, hash]=stored.split(':'); const result=crypto.scryptSync(password,salt,64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(result)); };
function json(res,data,status=200){const payload=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)});res.end(payload)}
function readBody(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>1e6){req.destroy();reject(new Error('Body too large'))}});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function getUser(req){const token=(req.headers.authorization||'').replace(/^Bearer\s+/,''); if(!token)return null; const db=readDb(); return db.users.find(u=>u.token===token)||null}
const routes={
 'GET /health':(req,res)=>json(res,{status:'ok'}),
 'POST /api/auth/signup':async(req,res)=>{const {username,password,deviceId}=await readBody(req);const name=normalizeUsername(username);if(!/^[a-z0-9_]{3,24}$/.test(name))return json(res,{error:'Use 3–24 lowercase letters, numbers, or underscores.'},400);if(String(password).length<8)return json(res,{error:'Password must be at least 8 characters.'},400);const db=readDb();if(isOwnerUsername(name)||db.users.some(u=>u.username===name))return json(res,{error:'This username is unavailable.'},409);const usedDevice=db.trialDevices.includes(deviceId);const now=Date.now();const user={id:crypto.randomUUID(),username:name,passwordHash:hashPassword(password),token:crypto.randomBytes(32).toString('hex'),createdAt:new Date().toISOString(),trialEndsAt:usedDevice?null:new Date(now+7*86400000).toISOString(),premiumUntil:null};db.users.push(user);if(deviceId&&!usedDevice)db.trialDevices.push(deviceId);writeDb(db);json(res,{token:user.token,user:publicUser(user),trialGranted:!usedDevice},201)},
 'POST /api/auth/signin':async(req,res)=>{const {username,password}=await readBody(req);const user=readDb().users.find(u=>u.username===normalizeUsername(username));if(!user||!verifyPassword(String(password),user.passwordHash))return json(res,{error:'Incorrect username or password.'},401);json(res,{token:user.token,user:publicUser(user)})},
 'GET /api/me':(req,res)=>{const user=getUser(req);if(!user)return json(res,{error:'Sign in required.'},401);json(res,{user:publicUser(user)})},
 'POST /api/billing/checkout':(req,res)=>{const user=getUser(req);if(!user)return json(res,{error:'Sign in required.'},401);if(isOwnerUsername(user.username))return json(res,{error:'Owner accounts have Premium forever.'},400);if(!process.env.STRIPE_CHECKOUT_URL)return json(res,{error:'Billing is not connected yet. Add a creator Stripe Checkout subscription URL before charging anyone.'},503);json(res,{url:process.env.STRIPE_CHECKOUT_URL})}
};
function serveStatic(req,res,pathname){let decoded;try{decoded=pathname==='/'?'index.html':decodeURIComponent(pathname)}catch{return json(res,{error:'Bad request'},400)}const rel=decoded.replace(/^\/+/,''),file=path.join(PUBLIC,rel);if(file!==PUBLIC&&!file.startsWith(PUBLIC+path.sep))return json(res,{error:'Not found'},404);fs.readFile(file,(err,data)=>{if(!err){res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});return res.end(data)}if(path.extname(rel))return json(res,{error:'Not found'},404);fs.readFile(path.join(PUBLIC,'index.html'),(e,html)=>e?json(res,{error:'Not found'},404):(res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}),res.end(html)))})}
http.createServer(async(req,res)=>{try{const {pathname}=new URL(req.url,`http://${req.headers.host||'localhost'}`);const handler=routes[`${req.method} ${pathname}`];if(handler)await handler(req,res);else serveStatic(req,res,pathname)}catch(err){console.error(err.message);if(!res.headersSent)json(res,{error:'Server error'},500)}}).listen(PORT,()=>console.log(`Listening on port ${PORT}`));

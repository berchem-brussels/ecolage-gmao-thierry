/**
 * Serveur SMTP factice pour les tests du courriel (0.17.0, point 2) : il répond comme un relais SMTP réel (codes 220, 250,
 * 235, 354, 221, refus 535 et 550) et garde les messages reçus. Aucune donnée ne sort de la machine de test.
 *   compte : { user, pass } attendus pour AUTH PLAIN ou LOGIN (sans compte, AUTH n'est pas annoncé) ;
 *   refuser : un destinataire qui contient ce texte reçoit 550.
 */
const net = require('net');

function demarrerSmtp({ compte = null, refuser = 'refus' } = {}) {
  const recus = [];
  const server = net.createServer((sock) => {
    sock.setEncoding('utf8');
    let tampon = '';
    let enDonnees = false;
    let message = { from: null, to: [], data: '' };
    let authLogin = null;
    const dire = (l) => sock.write(`${l}\r\n`);
    dire('220 smtp.factice ESMTP');
    sock.on('data', (morceau) => {
      tampon += morceau;
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const ligne = tampon.slice(0, i);
        tampon = tampon.slice(i + 2);
        if (enDonnees) {
          if (ligne === '.') {
            enDonnees = false;
            recus.push(message);
            message = { from: null, to: [], data: '' };
            dire('250 2.0.0 Ok: queued');
          } else message.data += `${ligne.startsWith('..') ? ligne.slice(1) : ligne}\r\n`;
          continue;
        }
        if (authLogin) {
          const v = Buffer.from(ligne, 'base64').toString('utf8');
          if (authLogin.etape === 'user') { authLogin = { etape: 'pass', user: v }; dire('334 UGFzc3dvcmQ6'); } else {
            const bon = compte && authLogin.user === compte.user && v === compte.pass;
            authLogin = null;
            dire(bon ? '235 2.7.0 Authentication successful' : '535 5.7.8 Authentication failed');
          }
          continue;
        }
        const cmd = ligne.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') {
          if (compte) { dire('250-smtp.factice'); dire('250-AUTH PLAIN LOGIN'); dire('250 8BITMIME'); } else { dire('250-smtp.factice'); dire('250 8BITMIME'); }
        } else if (cmd === 'AUTH') {
          const [, meca, init] = ligne.split(' ');
          if (meca.toUpperCase() === 'PLAIN') {
            const [, u, p] = Buffer.from(init || '', 'base64').toString('utf8').split('\u0000');
            dire(compte && u === compte.user && p === compte.pass ? '235 2.7.0 Authentication successful' : '535 5.7.8 Authentication failed');
          } else { authLogin = { etape: 'user' }; dire('334 VXNlcm5hbWU6'); }
        } else if (cmd === 'MAIL') { message.from = ligne.slice(10).trim(); dire('250 2.1.0 Ok'); } else if (cmd === 'RCPT') {
          const a = ligne.slice(8).trim();
          if (a.includes(refuser)) dire('550 5.1.1 Recipient address rejected'); else { message.to.push(a); dire('250 2.1.5 Ok'); }
        } else if (cmd === 'DATA') { enDonnees = true; dire('354 End data with <CR><LF>.<CR><LF>'); } else if (cmd === 'RSET') { message = { from: null, to: [], data: '' }; dire('250 Ok'); } else if (cmd === 'NOOP') dire('250 Ok');
        else if (cmd === 'QUIT') { dire('221 2.0.0 Bye'); sock.end(); } else dire('502 5.5.2 Command not recognized');
      }
    });
    sock.on('error', () => undefined);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    port: server.address().port, recus, stop: () => new Promise((r) => server.close(r)),
  })));
}

module.exports = { demarrerSmtp };

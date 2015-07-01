var slackChannel = process.env.SLACK_CHANNEL
var ircChannel = process.env.IRC_CHANNEL

var http = require('http')

var emojis = require('emojis')
var he = require('he')
var irc = require('irc')
var Slack = require('slack-client')

var client = new irc.Client('irc.freenode.net', 'slackbot', {channels: [ircChannel]})
var slack = new Slack(process.env.SLACK_TOKEN, true, true)

// SLACK -> IRC

slack.on('message', function (message) {
  if (!message.channel || !message.user) return

  var channel = slack.getChannelGroupOrDMByID(message.channel).name
  var user = slack.getUserByID(message.user).name
  var text = message.text

  if (channel !== slackChannel) return

  var users = message._client.users

  Object.keys(users).forEach(function (id) {
    var name = slack.getUserByID(id).name

    // replace numeric user id with name
    text = text.replace(new RegExp(
      '<@' + id + '>', 'gm'),
      '@' + name
    )

    // remove duplicate user id and name
    text = text.replace(new RegExp(
      '<@' + id + '|' + name + '>', 'gm'),
      ''
    )
  })

  text = emojis.replaceWithUnicode(text)

  /* eslint-disable no-cond-assign */
  // properly format links
  var match
  while (match = text.match(/<([^\|]*)\|([^>]*)>/m)) {
    text = text.replace('|' + match[2], '')
  }
  /* eslint-enable no-cond-assign */

  text = text.replace(':simple_smile:', ['☺︎', '☻'][Math.round(Math.random())])

  text = he.decode(text)

  client.say(ircChannel, '<' + user + '> ' + text)
})

slack.login()

// IRC -> SLACK

client.addListener('message', function (user, channel, text) {
  if (channel !== ircChannel) return
  slack.getChannelByName(slackChannel).send('*' + user + '* ' + text)
})

client.addListener('action', function (user, channel, text) {
  if (channel !== ircChannel) return
  slack.getChannelByName(slackChannel).send('*' + user + '* _' + text + '_')
})

// Small http server to tell the world what this bot is doing
// handy to keep the heroku instance running

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.end('beep boop\nSyncing Slack#' + slackChannel + ' to IRC' + ircChannel)
})

server.listen(process.env.PORT || 8000)

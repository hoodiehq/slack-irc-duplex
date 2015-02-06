var slackChannel = process.env.SLACK_CHANNEL
var ircChannel = process.env.IRC_CHANNEL

var http = require('http')

var emojis = require('emojis')
var irc = require('irc')
var Slack = require('slack-client')

var slack = new Slack(process.env.SLACK_TOKEN , true, true)
var client = new irc.Client('irc.freenode.net', 'slackbot', {
    channels: [ircChannel],
})

slack.on('message', function(message) {
  if (!message.channel || !message.user) return

  var channel = slack.getChannelGroupOrDMByID(message.channel).name
  var user = slack.getUserByID(message.user).name
  var text = message.text

  if (channel !== slackChannel) return

  var users = message._client.users
  Object.keys(users).forEach(function(id) {
    var name = slack.getUserByID(id).name

    text = text.replace(new RegExp(
      '<@' + id + '>', 'gm'),
      '@' + name
    )

    text = text.replace(new RegExp(
      '<@' + id + '|' + name + '>', 'gm'),
      ''
    )
  })

  text = emojis.replaceWithUnicode(text)

  var match;
  while (match = text.match(/<([^\|]*)\|([^>]*)>/m)) {
    text = text.replace('|'+match[2], '')
  }

  text = text.replace(':simple_smile:', ['☺︎', '☻'][Math.round(Math.random())])

  client.say(ircChannel, '<' + user + '> ' + text)
})

slack.login()

client.addListener('message', function (user, channel, text) {
  if (channel !== ircChannel) return
  slack.getChannelByName(slackChannel).send('*' + user + '* ' + text)
})

client.addListener('action', function (user, channel, text) {
  if (channel !== ircChannel) return
  slack.getChannelByName(slackChannel).send('*' + user + '* _' + text + '_')
})

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.end('beep boop\nSyncing Slack#' + slackChannel + ' to IRC' + ircChannel)
})

server.listen(process.env.PORT || 8000);


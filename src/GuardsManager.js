const Twit = require('twit');
const config = require('config');
const triggerLanguages = require('./triggers');


class GuardsManager {
  constructor() {
    const twitConfig = {
      consumer_key: config.get('guardsManager.consumerKey'),
      consumer_secret: config.get('guardsManager.consumerSecret'),
      access_token: config.get('guardsManager.accessToken'),
      access_token_secret: config.get('guardsManager.accessTokenSecret'),
      timeout_ms: config.get('twitter.timeoutMs'),
    };

    this._T = new Twit(twitConfig);
    this._streams = [];

    // binding methods
    this._handleTweet = this._handleTweet.bind(this);
  }

  // Internal use methods
  _containsTriggers(tweet) {
    const language = tweet.lang;
    const triggers = triggerLanguages.find(tl => tl.language === language).triggers;

    let isMatch = false;
    let i = 0;
    while (!isMatch && i < triggers.length) {
      isMatch = !!tweet.text.match(triggers[i++]);
    }

    return isMatch;
  }

  _isTweetValid(tweet) {
    const author = tweet.user.id_str;

    // discard from blacklisted users
    if (config.get('blacklist').includes(author)) {
      // console.log('*** Tweet discarded - blacklist author');
      return false;
    }

    // discard retweets
    if (tweet.retweeted_status || tweet.text.match(/^RT /)) {
      // console.log('*** Tweet discarded - retweet');
      return false;
    }

    // discard "youtube like" tweets
    if (tweet.text.match(/^I liked a @YouTube video/)) {
      // console.log('*** Tweet discarded - youtube like');
      return false;
    }

    if (!this._containsTriggers(tweet)) {
      // console.log('*** Tweet discarded - no triggers');
      return false;
    }

    return true;
  }

  // Event handlers
  _handleTweet(tweet) {
    if (this._isTweetValid(tweet)) {
      const statusId = tweet.id_str;
      const text = tweet.text;
      const author = {
        id: tweet.user.id_str,
        username: tweet.user.screen_name,
      };

      console.log(`*** Tweet valid from @${author.username} (${author.id})`);
      console.log(`  * ${statusId}`);
      console.log(`  * ${text}`);
    }
  }

  // Public methods
  startListening() {
    if (!this._streams.length) {
      triggerLanguages.forEach(t => {
        const track = [
          config.get('guardsManager.username'), ...t.triggers
        ].reduce((prev, next) => `${prev},${next}`, '');

        // stream status filter params
        const filterParams = {
          track,
          language: t.language,
        };

        const stream = this._T.stream('statuses/filter', filterParams);
        stream.on('tweet', this._handleTweet);

        this._streams.push(stream);
      });
    } else {
      this._streams.forEach(s => s.start());
    }

    console.log('*** Listening Twitter stream...');
  }

  stopListening() {
    if (this._streams.length) {
      this._streams.forEach(s => s.stop());
      console.log('*** Listening Twitter stream... STOP');
    }
  }
}


module.exports = GuardsManager;

"use strict";

const endpoints = [
  {
    name: 'Friends',
    method: 'GET',
    url: 'https://se-prof.np.community.playstation.net/userProfile/v1/users/{user}/friends/profiles2',
    query: {
      fields:	[
        "onlineId",
        "avatarUrls",
        "plus",
        "trophySummary(@default)",
        "isOfficiallyVerified",
        "personalDetail(@default,profilePictureUrls)",
        "primaryOnlineStatus",
        "presences(@titleInfo,hasBroadcastData)"
      ],
      sort:	'name-onlineId',
      //userFilter:	'online',
      avatarSizes:	'm',
      profilePictureSizes:	'm',
      offset:	0,
      limit:	36
    },
    params: {
      user: 'me'
    },
  }
];

module.exports = endpoints;

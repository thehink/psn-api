# PsnApi

##Usage
1. ```npm install https://github.com/thehink/PsnApi.git --save```
2. ```const psnApi = require('PsnApi')```

###Example
```javascript
const psnApi = require('PsnApi');

let psn = new psnApi("email", "password");

psn.login().then(profile => {
        psn.getFriends({
                user: "me"
            }, {
                userFilter: "online",
                fields: ["onlineId", "presences(@titleInfo,hasBroadcastData)"],
                offset:	0,
                limit:	36
            })
            .then(resp => {
                console.log(resp);
            })
            .catch(error => {
                console.log(error);
            });
    })
    .catch(error => {
        console.log(error);
    });
    
   ```

##Todo
* Add more endpoints
* Support for POST

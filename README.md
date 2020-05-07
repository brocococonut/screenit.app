# screenit.app
A simple screenshot application utilising puppeteer

## API
The API of screenit.app is pretty simple. The server serves static assets from the `site` directory, and has a `/screenshot` route.

The `/screenshot` route has 3 querystring arguments currently:
* `?fullpage` - Whether or not to screenshot the entire page. simply setting this argument is considered a truthy value
* `?size` - What size screen to emulate. The values for this are as follows (more may come in the future):
  * `m` - Mobile (375w x 812h)
  * `t` - Tablet (1024w x 1366h)
  * `d` - Desktop (1920w x 1080h)

The file will be cached for 2 * the interval (sometimes a little longer) so subsequent requests of the same domain/path and size are faster.
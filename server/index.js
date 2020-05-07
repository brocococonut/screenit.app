const cron = require('node-cron')
const debug = require('debug')
const fs = require('fs-extra')

const Koa = require('koa');
const serve = require('koa-static')
const route = require('koa-route')
const ratelimit = require('koa-ratelimit');
const puppeteer = require('puppeteer')
const rimraf = require('rimraf')

const app = new Koa()
const db = new Map();

const fsDebug = debug('app:fs')
const httpDebug = debug('app:http')

// At what interval to take a screenshot/use backup of page
const interval = 5 * 60 * 1000

// Env variables
const env = process.env
const {
  PORT = 3000,
  TIMEOUT = 15 * 1000
} = env

// Device screen sizes and user agents
const viewports = {
  m: {
    name: 'iPhone X',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    viewport: {
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      isLandscape: false
    }
  },
  t: {
    name: 'iPad Pro',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
    viewport: {
      width: 1024,
      height: 1366,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: false
    }
  },
  d: {
    name: 'Desktop',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36',
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: true
    }
  }
}

app.use(route.get('/screenshot', ratelimit({
  driver: 'memory',
  db,
  duration: 30000,
  errorMessage: 'Maybe you should drink less coffee...',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 6,
  disableHeader: false
})))

// Simple hasher for screenshot dir naming
const hasher = (str = '') => {
  var hash = 0, i, chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash*hash;
}

const attachmentOpts = { type: 'inline' }

// Get a floored time based on the provided interval
const getTimeFloored = () => {
  const curTime = new Date().getTime()
  let remainder = curTime % interval

  // Handle situations where the remainder is 3/4 the way through.
  // To make sure the files are still available within at least one minute from now,
  // boost the floored time to the next minute
  if (remainder < (interval / 4)) {
    remainder = interval - remainder
    remainder *= -1
  }
  return curTime - remainder
}

// Initialise the server and puppeteer instance
async function init() {
  const browser = await puppeteer.launch({
    args: ['--ignore-certificate-errors']
  })
  
  // Default exitHandler function - does general cleanup of disk and memory
  function exitHandler() {
    console.info('Cleaning up tmp files/directories')
    rimraf.sync('./tmp_*')
    browser.close()
  }

  // Handle exit events
  process.stdin.resume()
  const events = ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException']
  events.map(ev => process.on(ev, exitHandler.bind()))

  app.use(serve('../site/public'))

  // Main route
  app.use(route.get('/screenshot', async ctx => {
    // Puppeteer initialisation
    const page = await browser.newPage()

    try {
      // Limiter to prevent excessive screenshots
      let flooredTime = getTimeFloored()

      // Application defaults
      let url = ''
      let size = 'd'
      let fullPage = false

      // Get query string variables
      if (ctx.query.url) url = ctx.query.url
      if (ctx.query.size && viewports[ctx.query.size]) size = ctx.query.size
      if (ctx.query.fullpage) fullPage = true

      // URL Parsing
      if (url === '') return false
      if (!url.startsWith('http') && !url.startsWith('//')) url = `http://${url}`
      else if (url.startsWith('//')) url = `https:${url}`

      const domain = new URL(url)

      // Basic filename info
      const fileAttachmentName = encodeURIComponent(`${domain.host}${domain.pathname}`) + '.png'
      const fileDirName = `tmp_${flooredTime}_${fullPage ? 'fullpage' : ''}` + hasher(encodeURIComponent(domain.host + domain.pathname)).toString(16)
      const fileName = `${fileDirName}/${size}.png`

      // Attempt to create the temporary site directory directory
      try {
        await fs.mkdir(`${fileDirName}`)
      } catch (mkDirErr) {
        fsDebug(mkDirErr)
        fsDebug('Directory creation failed, it likely already exists')

        // Attempt to open and send the file if it exists
        try {
          // Simple check to see if the file exists
          await fs.accessSync(fileName)

          // Read the file to be sent
          const buffer = fs.readFileSync(fileName)
          ctx.attachment(fileAttachmentName, attachmentOpts)
          ctx.body = buffer

          return null
        } catch (readFileErr) {
          fsDebug(readFileErr)
          fsDebug('Directory exists, but file does not. Continue onwards')
        }
      }

      // Screen/device emulation
      await page.emulate(viewports[size])
      await page.goto(domain.toString(), { waitUntil: 'networkidle0', timeout: TIMEOUT })

      // Take a screenshot of the page and write it to disk

      const screenshotOpts = {
        fullPage,
        path: fileName,
        clip: {
          x: 0,
          y: 0,
          width: viewports[size].viewport.width,
          height: viewports[size].viewport.height,
        }
      }

      if (fullPage) delete screenshotOpts.clip

      const buffer = await page.screenshot(screenshotOpts)

      // Add the info to the response context
      ctx.attachment(fileAttachmentName, attachmentOpts)
      ctx.body = buffer

      return null
    } catch (err) {
      httpDebug(err)
      ctx.body = {
        error: err.toString(),
        message: 'Failed to load page'
      }
    } finally {
      await page.close()
    }
  }))

  // Schedule to remove old temp files
  cron.schedule('*/5 * * * *', async () => {
    try {
      const curTime = new Date().getTime()
      const remainder = curTime % interval
      const max = curTime - remainder - (2 * interval)
  
      // Get list of files/directories and remove those not starting with 'tmp_'
      let ls = await fs.readdir('./')
      ls = ls.filter(el => el.startsWith('tmp_'))
      
      // Remove directories that are older than the current date/time
      // floored and 2*intervals subtracted
      ls.map(async (dir) => {
        const time = dir.split('_')[1]
        const parsedTime = parseInt(time)
        if (parsedTime <= max) rimraf.sync(`./${dir}`)
      })
    } catch (err) {
      console.error(err)
    }
  })

  // Start listening on the desired port
  app.listen(PORT)
}

init()
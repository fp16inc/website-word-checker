import { Hono } from 'hono'
import Checker from './checker'
const app = new Hono()

app.get('/', (c) => c.html('<div><p>API is running</p><p>curl -X POST https://website-word-checker.fp16.co.jp/check -H "Content-Type: application/json" -d \'{"url":"","openAiApiKey":""}\'\n</p></div>'))

app.post('/check', async (c) => {
  const { url, openAiApiKey } = await c.req.json()
  const result = await Checker(url, openAiApiKey)
  return c.json(result)
})

export default app

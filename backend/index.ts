import { Hono } from 'hono'
import Checker from './checker'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

app.post('/check', async (c) => {
  const { url, openAiApiKey } = await c.req.json()
  const result = await Checker(url, openAiApiKey)
  return c.json(result)
})

export default app

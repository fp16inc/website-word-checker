import * as cheerio from 'cheerio'
import { RetrievalQAChain } from 'langchain/chains'
import { Document } from 'langchain/document'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { OpenAI } from 'langchain/llms/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'

class WebDataLoader extends BaseDocumentLoader {
  constructor(private data: string) {
    super()
  }

  async load(): Promise<Document[]> {
    return [new Document({ pageContent: this.data })]
  }
}

export function processHtmlContent(html: string): string {
  const $ = cheerio.load(html)
  const data = $('body').text()
  return data.replace(/\s+/g, ' ')
}

async function fetchData(url: string): Promise<string> {
  const fetchParams = {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    },
  }

  const response = await fetch(url, fetchParams)
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`)
  }

  const html = await response.text()

  return processHtmlContent(html)
}

export default async function Checker(url: string, openAiApiKey: string) {
  try {
    const webData = await fetchData(url)

    const loader = new WebDataLoader(webData)
    const docs = await loader.load()
    const splitter = new RecursiveCharacterTextSplitter({
      chunkOverlap: 1,
      chunkSize: 800,
    })
    const splittedDocs = await splitter.splitDocuments(docs)

    const store = await MemoryVectorStore.fromDocuments(
      splittedDocs,
      new OpenAIEmbeddings({ openAIApiKey: openAiApiKey }),
    )

    const model = new OpenAI({
      maxTokens: 4000,
      modelName: 'gpt-4-0125-preview',
      openAIApiKey: openAiApiKey,
    })

    const chain = RetrievalQAChain.fromLLM(model, store.asRetriever())

    const res = await chain.call({
      query:
        'ウェブサイトの文章に誤字、脱字、日本語として不自然な箇所をJSON形式で出力してください。以下のJSONフォーマットに合わせてください。[{"type": "", "text": "", "corrected": "", }]'
    })

    const jsonMatch = res.text.match(/```json\n([\s\S]*?)\n```/)
    if (!jsonMatch) {
      throw new Error('JSON形式のデータが見つかりませんでした。')
    }
    const jsonString = jsonMatch[1]

    return JSON.parse(jsonString)
  } catch (e) {
    console.error(e)
    return {
      error: e instanceof Error ? e.message : 'An unknown error occurred',
    }
  }
}

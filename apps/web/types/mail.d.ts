declare module 'mailparser' {
  interface ParsedMail {
    subject?: string
    from?: { text: string } | string
    date?: Date
    text?: string
    attachments?: Array<{
      filename: string
      contentType: string
      size: number
      content: Buffer
    }>
  }

  export function simpleParser(source: string | Buffer): Promise<ParsedMail>
}

declare module 'imapflow' {
  interface ImapFlowOptions {
    host: string
    port: number
    secure?: boolean
    auth: { user: string; pass: string }
    logger?: boolean
    tls?: { rejectUnauthorized?: boolean }
  }

  interface FetchOptions {
    source?: boolean
  }

  interface FetchOneResult {
    source?: Buffer
  }

  interface SearchCriteria {
    since?: Date
  }

  class ImapFlow {
    constructor(options: ImapFlowOptions)
    connect(): Promise<void>
    logout(): Promise<void>
    getMailboxLock(mailbox: string): Promise<{ release: () => void }>
    fetchOne(uid: number, options: FetchOptions, config: { uid: true }): Promise<FetchOneResult | null>
    search(criteria: SearchCriteria): Promise<number[]>
  }

  export { ImapFlow }
}

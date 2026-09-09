import { NextResponse } from 'next/server'

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MantiGestor API',
    version: '1.0.0',
    description: 'API for MantiGestor fiscal management platform',
  },
  paths: {
    '/api/facturas': {
      get: { summary: 'List invoices', tags: ['Facturas'] },
      post: { summary: 'Create invoice', tags: ['Facturas'] },
    },
    '/api/facturas/{id}': {
      get: { summary: 'Get invoice', tags: ['Facturas'] },
      put: { summary: 'Update invoice', tags: ['Facturas'] },
      delete: { summary: 'Delete invoice', tags: ['Facturas'] },
    },
    '/api/nominas': {
      get: { summary: 'List payrolls', tags: ['Nominas'] },
      post: { summary: 'Create payroll', tags: ['Nominas'] },
    },
    '/api/fiscal/empresas': {
      get: { summary: 'List companies', tags: ['Empresas'] },
      post: { summary: 'Create company', tags: ['Empresas'] },
    },
    '/api/fiscal/conciliacion': {
      get: { summary: 'List bank movements', tags: ['Conciliación'] },
      post: { summary: 'Save movements', tags: ['Conciliación'] },
    },
    '/api/ai/chat': {
      post: { summary: 'Chat with AI assistant', tags: ['AI'] },
    },
  },
}

export async function GET() {
  return NextResponse.json(swaggerSpec)
}

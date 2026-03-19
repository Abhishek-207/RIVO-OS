/**
 * Simple WhatsApp Chat Component.
 * Clean chat interface for both leads and clients.
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/dateUtils'
import { useMessageTemplates } from '@/hooks/useMessageTemplates'
import { fillTemplateVariables } from '@/utils/templateVariables'

interface Message {
  id: string
  content: string
  direction: 'outbound' | 'inbound'
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
  error_message?: string
}

interface ClientInfo {
  name?: string
  phone?: string
  email?: string
}

interface WhatsAppChatProps {
  messages: Message[]
  isLoading: boolean
  isSending: boolean
  onSend: (message: string) => void
  clientInfo?: ClientInfo
}

export function WhatsAppChat({ messages, isLoading, isSending, onSend, clientInfo }: WhatsAppChatProps) {
  const [newMessage, setNewMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<{ name: string; content: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: allTemplates } = useMessageTemplates()
  const templates = allTemplates?.filter(t => t.category === 'general')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim() || isSending) return
    onSend(newMessage.trim())
    setNewMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSelectTemplate = (template: { name: string; content: string }) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      const filledContent = fillTemplateVariables(selectedTemplate.content, clientInfo)
      setNewMessage(filledContent)
      setSelectedTemplate(null)
      setShowTemplates(false)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Sending...'
      case 'sent': return 'Sent'
      case 'delivered': return 'Delivered'
      case 'read': return 'Read'
      case 'failed': return 'Failed'
      default: return ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Messages - takes all available space */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#EFEAE2] rounded-lg min-h-[300px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-gray-400">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2',
                    msg.direction === 'outbound'
                      ? 'bg-[#D9FDD3] text-[#111B21] rounded-br-sm'
                      : 'bg-white text-[#111B21] rounded-bl-sm shadow-sm'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div className={cn(
                    'flex items-center gap-2 mt-1 text-[10px]',
                    msg.direction === 'outbound' ? 'text-[#667781] justify-end' : 'text-[#667781]'
                  )}>
                    <span>{formatTime(msg.created_at)}</span>
                    {msg.direction === 'outbound' && (
                      <span className={msg.status === 'failed' ? 'text-red-500' : ''}>
                        {getStatusText(msg.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input - sticky at bottom */}
      <div className="pt-3 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:border-gray-300 transition-colors flex-shrink-0"
          >
            Templates
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#00A884] resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="px-5 py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#008069] disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Message Templates</h3>
              <button
                onClick={() => { setShowTemplates(false); setSelectedTemplate(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Template List */}
              <div className="w-1/2 border-r border-gray-100 overflow-y-auto">
                {templates && templates.length > 0 ? (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={cn(
                        'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                        selectedTemplate?.name === template.name && 'bg-blue-50'
                      )}
                    >
                      <p className="text-sm font-medium text-gray-900">{template.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{template.content.slice(0, 50)}...</p>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No templates available
                  </div>
                )}
              </div>

              {/* Template Preview */}
              <div className="w-1/2 p-4 bg-gray-50 flex flex-col">
                {selectedTemplate ? (
                  <>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{selectedTemplate.name}</h4>
                    {clientInfo?.name && (
                      <p className="text-xs text-gray-500 mb-2">Preview for: {clientInfo.name}</p>
                    )}
                    <div className="flex-1 overflow-y-auto">
                      <div className="bg-white rounded-lg p-3 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                        {fillTemplateVariables(selectedTemplate.content, clientInfo)}
                      </div>
                    </div>
                    <button
                      onClick={handleUseTemplate}
                      className="mt-3 w-full py-2 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#008069] transition-colors"
                    >
                      Use Template
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Select a template to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

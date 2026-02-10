/**
 * Side panel for creating and editing message templates.
 *
 * Supports two types:
 * - General: internal templates for manual use in WhatsApp chat
 * - System: linked to YCloud templates, auto-triggered on stage/status changes
 */

import { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCreateTemplate,
  useUpdateTemplate,
  useTriggerOptions,
  useYCloudTemplates,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'
import { TEMPLATE_VARIABLES, previewTemplateWithSampleData } from '@/utils/templateVariables'

interface TemplateFormProps {
  template?: MessageTemplate | null
  onClose: () => void
  onSuccess?: () => void
}

export function TemplateForm({ template, onClose, onSuccess }: TemplateFormProps) {
  const isCreateMode = !template
  const [name, setName] = useState(template?.name || '')
  const [category, setCategory] = useState<'system' | 'general'>(template?.category || 'general')
  const [content, setContent] = useState(template?.content || '')
  const [isActive, setIsActive] = useState(template?.is_active ?? true)
  const [showPreview, setShowPreview] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // System template fields
  const [triggerType, setTriggerType] = useState<string>(template?.trigger_type || '')
  const [triggerValue, setTriggerValue] = useState(template?.trigger_value || '')
  const [ycloudTemplateName, setYcloudTemplateName] = useState(template?.ycloud_template_name || '')
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>(template?.variable_mapping || {})

  const { data: triggerOptions } = useTriggerOptions()
  const { data: ycloudTemplates, isLoading: ycloudLoading } = useYCloudTemplates()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()

  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (template) {
      setName(template.name)
      setCategory(template.category)
      setContent(template.content)
      setIsActive(template.is_active)
      setTriggerType(template.trigger_type || '')
      setTriggerValue(template.trigger_value || '')
      setYcloudTemplateName(template.ycloud_template_name || '')
      setVariableMapping(template.variable_mapping || {})
    }
  }, [template])

  // Get trigger value options based on selected trigger type
  const triggerValueOptions = useMemo(() => {
    if (!triggerOptions || !triggerType) return []
    return triggerType === 'case_stage'
      ? triggerOptions.case_stage
      : triggerOptions.client_status
  }, [triggerOptions, triggerType])

  // Get the selected YCloud template's body variables count
  const selectedYCloudTemplate = useMemo(() => {
    if (!ycloudTemplates || !ycloudTemplateName) return null
    return ycloudTemplates.find(t => t.name === ycloudTemplateName) || null
  }, [ycloudTemplates, ycloudTemplateName])

  // Extract number of variables from YCloud template body
  const ycloudVarCount = useMemo(() => {
    if (!selectedYCloudTemplate) return 0
    const bodyComponent = selectedYCloudTemplate.components?.find(c => c.type === 'BODY')
    if (!bodyComponent?.text) return 0
    const matches = bodyComponent.text.match(/\{\{\d+\}\}/g)
    return matches ? matches.length : 0
  }, [selectedYCloudTemplate])

  const handleSave = async () => {
    setSaveError(null)

    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }
    if (category === 'general' && !content.trim()) {
      setSaveError('Content is required')
      return
    }

    if (category === 'system') {
      if (!triggerType) {
        setSaveError('Trigger type is required for system templates')
        return
      }
      if (!triggerValue) {
        setSaveError('Trigger value is required for system templates')
        return
      }
      if (!ycloudTemplateName) {
        setSaveError('YCloud template is required for system templates')
        return
      }
    }

    try {
      // For system templates, store YCloud template body as content for activity logs
      const systemContent = selectedYCloudTemplate?.components?.find(c => c.type === 'BODY')?.text || name.trim()

      const payload = {
        name: name.trim(),
        category,
        content: category === 'system' ? systemContent : content.trim(),
        is_active: isActive,
        ...(category === 'system' && {
          trigger_type: triggerType as 'case_stage' | 'client_status',
          trigger_value: triggerValue,
          ycloud_template_name: ycloudTemplateName,
          variable_mapping: variableMapping,
        }),
      }

      if (isCreateMode) {
        await createMutation.mutateAsync(payload)
      } else {
        await updateMutation.mutateAsync({ id: template!.id, data: payload })
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + `{${varName}}` + content.slice(end)
      setContent(newContent)
      setTimeout(() => {
        textarea.focus()
        const newPos = start + varName.length + 2
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    } else {
      setContent(content + `{${varName}}`)
    }
  }

  const updateVariableMapping = (position: string, varName: string) => {
    setVariableMapping(prev => ({ ...prev, [position]: varName }))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-1/2 min-w-[480px] max-w-[800px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {isCreateMode ? 'New Template' : 'Edit Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Save Error */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {saveError}
            </div>
          )}

          {/* Template Type Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Template Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('general')}
                className={cn(
                  'flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 border',
                  category === 'general'
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setCategory('system')}
                className={cn(
                  'flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 border',
                  category === 'system'
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                System
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder={category === 'system' ? 'e.g., Preapproval Notification' : 'e.g., Welcome Message'}
            />
          </div>

          {/* System Template Config */}
          {category === 'system' && (
            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Trigger Configuration</h3>

              {/* YCloud Template */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  YCloud Template <span className="text-red-500">*</span>
                </label>
                {ycloudLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading templates from YCloud...
                  </div>
                ) : (
                  <select
                    value={ycloudTemplateName}
                    onChange={(e) => {
                      setYcloudTemplateName(e.target.value)
                      setVariableMapping({})
                    }}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                  >
                    <option value="">Select approved template...</option>
                    {ycloudTemplates?.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.language})
                      </option>
                    ))}
                  </select>
                )}
                {ycloudTemplates && ycloudTemplates.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">No approved templates found in YCloud. Create and get templates approved in YCloud first.</p>
                )}
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Trigger On <span className="text-red-500">*</span>
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => { setTriggerType(e.target.value); setTriggerValue('') }}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                >
                  <option value="">Select trigger type...</option>
                  <option value="case_stage">Case Stage Change</option>
                  <option value="client_status">Client Status Change</option>
                </select>
              </div>

              {/* Trigger Value */}
              {triggerType && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    When {triggerType === 'case_stage' ? 'Stage' : 'Status'} Changes To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                  >
                    <option value="">Select {triggerType === 'case_stage' ? 'stage' : 'status'}...</option>
                    {triggerValueOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Variable Mapping */}
              {ycloudVarCount > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Variable Mapping
                  </label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Map each positional variable in the YCloud template to a Rivo variable.
                  </p>
                  <div className="space-y-2">
                    {Array.from({ length: ycloudVarCount }, (_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12 flex-shrink-0">{`{{${i + 1}}}`}</span>
                        <select
                          value={variableMapping[String(i + 1)] || ''}
                          onChange={(e) => updateVariableMapping(String(i + 1), e.target.value)}
                          className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                        >
                          <option value="">Select variable...</option>
                          {TEMPLATE_VARIABLES.map(v => (
                            <option key={v.name} value={v.name}>
                              {`{${v.name}}`} — {v.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Variables + Content + Preview — only for General templates */}
          {category === 'general' && (
            <>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Available variables (click to insert):</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => insertVariable(variable.name)}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-[#1e3a5f] hover:text-white hover:border-[#1e3a5f] transition-colors"
                      title={variable.description}
                    >
                      {`{${variable.name}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Message Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="template-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hello {first_name}, thank you for reaching out..."
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-[#1e3a5f] hover:underline"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>

                {showPreview && content && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1.5">Preview with sample data:</p>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white rounded p-2 border border-gray-200">
                      {previewTemplateWithSampleData(content)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* YCloud template preview — only for System templates with a selected template */}
          {category === 'system' && selectedYCloudTemplate && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[10px] text-gray-500 mb-1.5">YCloud Template Preview:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {selectedYCloudTemplate.components?.find(c => c.type === 'BODY')?.text || 'No body content'}
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  !isActive
                    ? 'bg-gray-200 text-gray-600 border-gray-300'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCreateMode ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

import { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import markdownItMark from 'markdown-it-mark'
import { align } from '@mdit/plugin-align'
import { tasklist } from '@mdit/plugin-tasklist'
import parse from 'html-react-parser'

/**
 * useMarkdown - Hook for rendering markdown text to React elements
 *
 * Initializes markdown-it with plugins and provides a render function
 * that safely converts markdown strings to React elements
 *
 * Features:
 * - Bold, italic, strikethrough, highlighting
 * - Task lists (GitHub-style checkboxes)
 * - Text alignment (::: left, ::: center, ::: right, ::: justify)
 * - Headers, lists, links, code, blockquotes
 * - HTML disabled for security
 * - Line breaks enabled
 * - Auto-linking URLs
 *
 * @example
 * ```tsx
 * const { renderMarkdown } = useMarkdown()
 *
 * return (
 *   <div>
 *     {renderMarkdown('**Bold** and *italic* text')}
 *   </div>
 * )
 * ```
 */
export function useMarkdown() {
  // Initialize markdown-it instance with plugins (memoized)
  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: false, // Disable HTML for security
      breaks: true, // Convert line breaks to <br>
      linkify: true, // Auto-convert URLs to links
      typographer: true, // Enable smart quotes and dashes
    })

    // Add plugins
    instance.use(markdownItMark) // ==highlight== syntax
    instance.use(align) // ::: left/center/right/justify syntax
    instance.use(tasklist, {
      disabled: true, // Make checkboxes read-only
      label: true, // Wrap checkbox and label in <label>
    })

    return instance
  }, [])

  /**
   * Render markdown text to React elements
   * @param text - Raw markdown text
   * @returns React elements
   */
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text || text.trim() === '') {
      return null
    }

    try {
      // Render markdown to HTML
      const html = md.render(text)

      // Parse HTML to React elements (safe, no dangerouslySetInnerHTML)
      return parse(html)
    } catch (error) {
      // Fallback to plain text if parsing fails
      console.error('Markdown rendering error:', error)
      return text
    }
  }

  return {
    renderMarkdown,
    md, // Expose the instance for advanced usage
  }
}

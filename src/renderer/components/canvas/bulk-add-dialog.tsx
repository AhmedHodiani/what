import { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

interface BulkAddDialogProps {
	open: boolean
	onClose: () => void
	onImport: (cards: Array<{ front: string; back: string }>) => void
}

interface VocabularyItem {
	id: number
	text: string
	name: string
	subTitle: string | null
	audios: Array<{
		mp3Src: string
		mainContentImage: {
			id: number
			staticUrl: string
			__typename: string
		} | null
		__typename: string
	}>
	__typename: string
}

interface ApiResponse {
	data: {
		content: {
			vocabularies: VocabularyItem[]
		}
	}
}

export function BulkAddDialog({ open, onClose, onImport }: BulkAddDialogProps) {
	const [url, setUrl] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const extractLessonId = (lessonUrl: string): string | null => {
		// Extract lesson ID from URL like: https://learngerman.dw.com/en/zahlen-von-1-bis-100/l-37265621/lv
		const match = lessonUrl.match(/\/l-(\d+)/)
		return match ? match[1] : null
	}

	const convertImageUrl = (staticUrl: string): string => {
		// Convert ${formatId} placeholder to actual format (e.g., 601 for medium size)
		return staticUrl.replace('${formatId}', '601')
	}

	const stripHtmlTags = (html: string): string => {
		// Remove HTML tags from text like "<p>eight</p>\n"
		return html.replace(/<[^>]*>/g, '').trim()
	}

	const handleImport = async () => {
		setError('')
		setLoading(true)

		try {
			const lessonId = extractLessonId(url)
			if (!lessonId) {
				throw new Error(
					'Invalid URL format. Expected format: https://learngerman.dw.com/.../l-XXXXXXXX/...',
				)
			}

			// GraphQL query to fetch lesson vocabulary
			const graphqlQuery = {
				operationName: 'LessonVocabulary',
				variables: {
					lessonId: Number.parseInt(lessonId),
					lessonLang: 'ENGLISH',
					appName: 'mdl',
				},
				extensions: {
					persistedQuery: {
						version: 1,
						sha256Hash:
							'5ba28d25b5d73702698649ff094df3866b9503f64db819032ab4ce68d2ede228',
					},
				},
			}

			// Build query string
			const params = new URLSearchParams({
				operationName: graphqlQuery.operationName,
				variables: JSON.stringify(graphqlQuery.variables),
				extensions: JSON.stringify(graphqlQuery.extensions),
			})

			const response = await fetch(
				`https://learngerman.dw.com/graphql?${params.toString()}`,
				{
					method: 'GET',
					headers: {
						'x-apollo-operation-name': 'LessonVocabulary',
					},
				},
			)

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`)
			}

			const data: ApiResponse = await response.json()

			if (!data.data?.content?.vocabularies) {
				throw new Error('Invalid API response format')
			}

			// Convert API data to cards format
			const cards = data.data.content.vocabularies.map((vocab) => {
				// Front: German word (with subtitle if available) + audio + image
				let front = vocab.name
				if (vocab.subTitle) {
					front += `\n\n*${vocab.subTitle}*`
				}

				// Add audio to front if available
				if (vocab.audios.length > 0 && vocab.audios[0].mp3Src) {
					front += `\n\n[AUDIO:${vocab.audios[0].mp3Src}]`
				}

				// Add image to front if available
				if (
					vocab.audios.length > 0 &&
					vocab.audios[0].mainContentImage?.staticUrl
				) {
					const imageUrl = convertImageUrl(
						vocab.audios[0].mainContentImage.staticUrl,
					)
					front += `\n\n![](${imageUrl})`
				}

				// Back: English translation only
				const back = stripHtmlTags(vocab.text)

				return { front, back }
			})

			onImport(cards)
			onClose()
			setUrl('')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error occurred')
		} finally {
			setLoading(false)
		}
	}

	const handleClose = () => {
		if (!loading) {
			setUrl('')
			setError('')
			onClose()
		}
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
			<div className="bg-gray-900 rounded-lg border border-purple-400/30 p-6 w-full max-w-md">
				<h3 className="text-xl font-bold text-purple-400 mb-4">
					Bulk Add from Nicos Weg
				</h3>

				<div className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="lesson-url" className="block text-sm text-gray-400">
							Lesson URL
						</label>
						<input
							id="lesson-url"
							type="url"
							placeholder="https://learngerman.dw.com/en/zahlen-von-1-bis-100/l-37265621/lv"
							value={url}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setUrl(e.target.value)
							}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !loading && url) {
									handleImport()
								} else if (e.key === 'Escape') {
									handleClose()
								}
							}}
							disabled={loading}
							className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all font-mono text-sm"
							autoFocus
						/>
						<p className="text-xs text-gray-500">
							Paste the lesson URL from learngerman.dw.com (Nicos Weg course)
						</p>
					</div>

					{error && (
						<div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
							<AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
							<p className="flex-1">{error}</p>
						</div>
					)}
				</div>

				<div className="flex gap-3 justify-end mt-6">
					<button
						className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={handleClose}
						disabled={loading}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						onClick={handleImport}
						disabled={loading || !url}
						type="button"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Importing...
							</>
						) : (
							'Import Cards'
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

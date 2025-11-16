import { useState } from 'react'
import { AlertCircle, Loader2, ChevronDown, ChevronRight, BookOpen, Link } from 'lucide-react'
import { useShortcut, ShortcutContext } from 'renderer/shortcuts'
import lessonsData from '../../data/all_lessons.json'

interface BulkAddDialogProps {
	open: boolean
	onClose: () => void
	onImport: (cards: Array<{ front: string; back: string }>) => void
}

interface Lesson {
	id: number
	shortTitle: string
	learningTargetHeadline: string
	namedUrl: string
}

interface ContentLink {
	id: number
	groupName: string
	target: Lesson
}

interface LessonsData {
	contentLinks: ContentLink[]
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
	const [view, setView] = useState<'picker' | 'manual'>('picker')
	const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

	if (!open) return null

	// Group lessons by chapter
	const groupedLessons = (lessonsData as LessonsData).contentLinks.reduce(
		(acc, link) => {
			if (!acc[link.groupName]) {
				acc[link.groupName] = []
			}
			acc[link.groupName].push(link.target)
			return acc
		},
		{} as Record<string, Lesson[]>,
	)

	const chapters = Object.entries(groupedLessons).map(([groupName, lessons]) => ({
		groupName,
		lessons,
	}))

	const toggleChapter = (groupName: string) => {
		const newExpanded = new Set(expandedChapters)
		if (newExpanded.has(groupName)) {
			newExpanded.delete(groupName)
		} else {
			newExpanded.add(groupName)
		}
		setExpandedChapters(newExpanded)
	}

	const handleLessonSelect = async (lesson: Lesson) => {
		const fullUrl = `https://learngerman.dw.com${lesson.namedUrl}`
		setUrl(fullUrl)
		setError('')
		setLoading(true)

		try {
			const lessonId = extractLessonId(fullUrl)
			if (!lessonId) {
				throw new Error('Invalid lesson format')
			}

			await performImport(lessonId)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error occurred')
		} finally {
			setLoading(false)
		}
	}

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

	const performImport = async (lessonId: string) => {
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
		setView('picker')
		setExpandedChapters(new Set())
	}

	const handleManualImport = async () => {
		setError('')
		setLoading(true)

		try {
			const lessonId = extractLessonId(url)
			if (!lessonId) {
				throw new Error(
					'Invalid URL format. Expected format: https://learngerman.dw.com/.../l-XXXXXXXX/...',
				)
			}

			await performImport(lessonId)
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
			setView('picker')
			setExpandedChapters(new Set())
			onClose()
		}
	}

	// Register keyboard shortcuts
	useShortcut(
		{
			key: 'escape',
			context: ShortcutContext.Dialog,
			action: handleClose,
			description: 'Close bulk add dialog',
		},
		[handleClose]
	)

	return (
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999"
			onClick={handleClose}
		>
			<div
				className="bg-black/90 rounded-lg shadow-2xl border border-purple-400/30 p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center gap-3 mb-4">
					<div className="text-3xl">📚</div>
					<div className="flex-1">
						<h2 className="text-xl font-semibold text-purple-400">
							Bulk Add from Nicos Weg
						</h2>
						<p className="text-sm text-gray-400 mt-0.5">
							Import German vocabulary lessons
						</p>
					</div>
				</div>

				{/* View Tabs */}
				<div className="flex gap-2 mb-4 border-b border-purple-400/20 pb-2">
					<button
						type="button"
						onClick={() => setView('picker')}
						disabled={loading}
						className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
							view === 'picker'
								? 'bg-purple-600 text-white'
								: 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
						}`}
					>
						<BookOpen className="w-4 h-4" />
						Lesson Picker
					</button>
					<button
						type="button"
						onClick={() => setView('manual')}
						disabled={loading}
						className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
							view === 'manual'
								? 'bg-purple-600 text-white'
								: 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
						}`}
					>
						<Link className="w-4 h-4" />
						Manual URL
					</button>
				</div>

				{/* Content */}
				{view === 'picker' ? (
					<>
						<div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
							{chapters.map((chapter) => {
								const isExpanded = expandedChapters.has(chapter.groupName)
								return (
									<div key={chapter.groupName} className="border border-gray-700 rounded-lg overflow-hidden">
										<button
											type="button"
											onClick={() => toggleChapter(chapter.groupName)}
											disabled={loading}
											className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 transition-colors text-left"
										>
											<span className="font-medium text-gray-200">
												{chapter.groupName}
											</span>
											<div className="flex items-center gap-2">
												<span className="text-xs text-gray-500">
													{chapter.lessons.length} lessons
												</span>
												{isExpanded ? (
													<ChevronDown className="h-4 w-4 text-purple-400" />
												) : (
													<ChevronRight className="h-4 w-4 text-gray-400" />
												)}
											</div>
										</button>
										{isExpanded && (
											<div className="bg-gray-900/50 divide-y divide-gray-700">
												{chapter.lessons.map((lesson) => (
													<button
														key={lesson.id}
														type="button"
														onClick={() => handleLessonSelect(lesson)}
														disabled={loading}
														className="w-full px-6 py-3 text-left hover:bg-gray-800 transition-colors group"
													>
														<div className="flex items-start justify-between gap-2">
															<div className="flex-1">
																<div className="font-medium text-white group-hover:text-purple-400 transition-colors">
																	{lesson.shortTitle}
																</div>
																{lesson.learningTargetHeadline && (
																	<div className="text-sm text-gray-400 mt-1">
																		{lesson.learningTargetHeadline}
																	</div>
																)}
															</div>
														</div>
													</button>
												))}
											</div>
										)}
									</div>
								)
							})}
						</div>

						{error && (
							<div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400 mb-4">
								<AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
								<p className="flex-1">{error}</p>
							</div>
						)}

						{loading && (
							<div className="flex items-center justify-center gap-2 text-purple-400 mb-4">
								<Loader2 className="h-5 w-5 animate-spin" />
								<span>Importing lesson...</span>
							</div>
						)}

						{/* Actions */}
						<div className="flex justify-end pt-4 border-t border-purple-400/20">
							<button
								className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
								onClick={handleClose}
								disabled={loading}
								type="button"
							>
								Cancel
							</button>
						</div>
					</>
				) : (
					<>
						<div className="flex-1 space-y-4 mb-4">
							<div className="space-y-2">
								<label htmlFor="lesson-url" className="block text-sm font-medium text-gray-300">
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
											handleManualImport()
										} else if (e.key === 'Escape') {
											handleClose()
										}
									}}
									disabled={loading}
									className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all font-mono text-sm"
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

						{/* Actions */}
						<div className="flex gap-3 justify-end pt-4 border-t border-purple-400/20">
							<button
								className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
								onClick={handleClose}
								disabled={loading}
								type="button"
							>
								Cancel
							</button>
							<button
								className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								onClick={handleManualImport}
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
					</>
				)}

				{/* Keyboard hints */}
				<div className="flex gap-4 mt-3 text-xs text-gray-400">
					<div className="flex items-center gap-1.5">
						<kbd className="px-1.5 py-0.5 bg-black/50 border border-purple-400/30 rounded text-purple-400">
							Esc
						</kbd>
						<span>Close</span>
					</div>
					{view === 'manual' && (
						<div className="flex items-center gap-1.5">
							<kbd className="px-1.5 py-0.5 bg-black/50 border border-purple-400/30 rounded text-purple-400">
								Enter
							</kbd>
							<span>Import</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface AudioPlayerProps {
	src: string
	autoPlay?: boolean
	className?: string
}

export function AudioPlayer({ src, autoPlay = false, className = '' }: AudioPlayerProps) {
	const audioRef = useRef<HTMLAudioElement>(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [error, setError] = useState(false)
	const [isLooping, setIsLooping] = useState(false)

	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return

		audio.loop = isLooping
	}, [isLooping])

	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return

		const handleLoadedMetadata = () => {
			setDuration(audio.duration)
			setError(false)
		}

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime)
		}

		const handleEnded = () => {
			setIsPlaying(false)
			setCurrentTime(0)
		}

		const handleError = () => {
			setError(true)
			setIsPlaying(false)
		}

		const handlePlay = () => setIsPlaying(true)
		const handlePause = () => setIsPlaying(false)

		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('ended', handleEnded)
		audio.addEventListener('error', handleError)
		audio.addEventListener('play', handlePlay)
		audio.addEventListener('pause', handlePause)

		return () => {
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('ended', handleEnded)
			audio.removeEventListener('error', handleError)
			audio.removeEventListener('play', handlePlay)
			audio.removeEventListener('pause', handlePause)
		}
	}, [])

	useEffect(() => {
		if (autoPlay && audioRef.current && !error) {
			audioRef.current.play().catch(() => {
				// Auto-play might be blocked by browser policy
				setIsPlaying(false)
			})
		}
	}, [autoPlay, error])

	const togglePlay = () => {
		if (!audioRef.current) return

		if (isPlaying) {
			audioRef.current.pause()
		} else {
			audioRef.current.play().catch(() => {
				setError(true)
			})
		}
	}

	const toggleLoop = () => {
		const newLoopState = !isLooping
		setIsLooping(newLoopState)
		
		if (!audioRef.current) return
		
		if (newLoopState) {
			// When enabling loop, start playing
			audioRef.current.play().catch(() => {
				setError(true)
			})
		} else {
			// When disabling loop, pause
			audioRef.current.pause()
		}
	}

	const formatTime = (seconds: number): string => {
		if (!Number.isFinite(seconds)) return '0:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	if (error) {
		return (
			<div className={`flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg ${className}`}>
				<div className="text-red-400 text-sm">Failed to load audio</div>
			</div>
		)
	}

	return (
		<div className={`flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-400/30 rounded-lg ${className}`}>
			<audio ref={audioRef} src={src} preload="metadata" />
			
			{/* Play/Pause Button */}
			<button
				onClick={togglePlay}
				className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors shrink-0"
				type="button"
				aria-label={isPlaying ? 'Pause' : 'Play'}
			>
				{isPlaying ? (
					<Pause size={18} className="text-white" fill="white" />
				) : (
					<Play size={18} className="text-white ml-0.5" fill="white" />
				)}
			</button>

			{/* Time Display */}
			<div className="flex items-center gap-2 text-sm text-purple-300 min-w-0 flex-1">
				<span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
				<span className="text-purple-400/50">/</span>
				<span className="font-mono tabular-nums text-purple-400/70">{formatTime(duration)}</span>
			</div>

			{/* Loop Toggle Button */}
			<button
				onClick={toggleLoop}
				className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0 ${
					isLooping 
						? 'bg-purple-600 hover:bg-purple-500' 
						: 'bg-purple-600/50 hover:bg-purple-600'
				}`}
				type="button"
				aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
			>
				<RotateCcw size={14} className="text-white" />
			</button>
		</div>
	)
}

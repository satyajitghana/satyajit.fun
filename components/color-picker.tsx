'use client';

import Color from 'color';
import { PipetteIcon } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import {
	type ComponentProps,
	createContext,
	type HTMLAttributes,
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ColorPickerContextValue {
	hue: number;
	saturation: number;
	lightness: number;
	alpha: number;
	mode: string;
	setHue: (hue: number) => void;
	setSaturation: (saturation: number) => void;
	setLightness: (lightness: number) => void;
	setAlpha: (alpha: number) => void;
	setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
	undefined
);

export const useColorPicker = () => {
	const context = useContext(ColorPickerContext);
	if (!context) {
		throw new Error('useColorPicker must be used within a ColorPickerProvider');
	}
	return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
	value?: Parameters<typeof Color>[0];
	defaultValue?: Parameters<typeof Color>[0];
	onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export const ColorPicker = ({
	value,
	defaultValue = '#000000',
	onChange,
	className,
	...props
}: ColorPickerProps) => {
	const selectedColor = useMemo(() => {
		try {
			return Color(value);
		} catch {
			return Color('#000000');
		}
	}, [value]);

	const defaultColor = useMemo(() => {
		try {
			return Color(defaultValue);
		} catch {
			return Color('#000000');
		}
	}, [defaultValue]);

	const [hue, setHue] = useState(
		selectedColor.hue() || defaultColor.hue() || 0
	);
	const [saturation, setSaturation] = useState(
		selectedColor.saturationl() || defaultColor.saturationl() || 100
	);
	const [lightness, setLightness] = useState(
		selectedColor.lightness() || defaultColor.lightness() || 50
	);
	const [alpha, setAlpha] = useState(
		selectedColor.alpha() * 100 || defaultColor.alpha() * 100
	);
	const [mode, setMode] = useState('hex');
	const isInternalUpdate = useRef(false);

	// Update color when controlled value changes (external update)
	useEffect(() => {
		if (value && !isInternalUpdate.current) {
			try {
				const c = Color(value);
				setHue(c.hue());
				setSaturation(c.saturationl());
				setLightness(c.lightness());
				setAlpha(c.alpha() * 100);
			} catch (e) {
				console.error("Invalid color value", e);
			}
		}
		isInternalUpdate.current = false;
	}, [value]);

	// Notify parent of changes (internal update from user interaction)
	const notifyChange = useCallback((h: number, s: number, l: number, a: number) => {
		if (onChange) {
			isInternalUpdate.current = true;
			const color = Color.hsl(h, s, l).alpha(a / 100);
			const rgba = color.rgb().array();
			onChange([rgba[0], rgba[1], rgba[2], a / 100]);
		}
	}, [onChange]);

	// Wrapped setters that notify parent
	const handleSetHue = useCallback((h: number) => {
		setHue(h);
		notifyChange(h, saturation, lightness, alpha);
	}, [saturation, lightness, alpha, notifyChange]);

	const handleSetSaturation = useCallback((s: number) => {
		setSaturation(s);
		notifyChange(hue, s, lightness, alpha);
	}, [hue, lightness, alpha, notifyChange]);

	const handleSetLightness = useCallback((l: number) => {
		setLightness(l);
		notifyChange(hue, saturation, l, alpha);
	}, [hue, saturation, alpha, notifyChange]);

	const handleSetAlpha = useCallback((a: number) => {
		setAlpha(a);
		notifyChange(hue, saturation, lightness, a);
	}, [hue, saturation, lightness, notifyChange]);

	return (
		<ColorPickerContext.Provider
			value={{
				hue,
				saturation,
				lightness,
				alpha,
				mode,
				setHue: handleSetHue,
				setSaturation: handleSetSaturation,
				setLightness: handleSetLightness,
				setAlpha: handleSetAlpha,
				setMode,
			}}
		>
			<div
				className={cn('flex size-full flex-col gap-4', className)}
				{...props}
			/>
		</ColorPickerContext.Provider>
	);
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
	({ className, ...props }: ColorPickerSelectionProps) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const [isDragging, setIsDragging] = useState(false);
		const [positionX, setPositionX] = useState(0);
		const [positionY, setPositionY] = useState(0);
		const { hue, saturation, lightness, setSaturation, setLightness } = useColorPicker();

		// Sync position with current saturation/lightness when not dragging
		// We use refs to avoid re-triggering this effect when setting state inside
		// or we just rely on visual updates via style prop if possible, but we need
		// the handle position state.
		useEffect(() => {
			if (!isDragging) {
				// To avoid loops and "max update depth", we check if values are significantly different
				const newX = saturation / 100;
				// lightness = topLightness * (1 - y)
				const topLightness = newX < 0.01 ? 100 : 50 + 50 * (1 - newX);
				const newY = topLightness === 0 ? 0 : 1 - (lightness / topLightness);
				const clampedY = Math.max(0, Math.min(1, newY));

				if (Math.abs(positionX - newX) > 0.001) {
					setPositionX(newX);
				}
				if (Math.abs(positionY - clampedY) > 0.001) {
					setPositionY(clampedY);
				}
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [saturation, lightness, isDragging]);

		const backgroundGradient = useMemo(() => {
			return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`;
		}, [hue]);

		const handlePointerMove = useCallback(
			(event: PointerEvent) => {
				if (!(isDragging && containerRef.current)) {
					return;
				}
				const rect = containerRef.current.getBoundingClientRect();
				const x = Math.max(
					0,
					Math.min(1, (event.clientX - rect.left) / rect.width)
				);
				const y = Math.max(
					0,
					Math.min(1, (event.clientY - rect.top) / rect.height)
				);

				setPositionX(x);
				setPositionY(y);

				const newSaturation = x * 100;
				setSaturation(newSaturation);

				// This logic matches the user's provided snippet
				const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
				const newLightness = topLightness * (1 - y);
				setLightness(newLightness);
			},
			[isDragging, setSaturation, setLightness]
		);

		useEffect(() => {
			const handlePointerUp = () => setIsDragging(false);
			if (isDragging) {
				window.addEventListener('pointermove', handlePointerMove);
				window.addEventListener('pointerup', handlePointerUp);
			}
			return () => {
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('pointerup', handlePointerUp);
			};
		}, [isDragging, handlePointerMove]);

		return (
			<div
				className={cn('relative size-full cursor-crosshair rounded', className)}
				onPointerDown={(e) => {
					e.preventDefault();
					setIsDragging(true);
					const rect = e.currentTarget.getBoundingClientRect();
					const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
					const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
					setPositionX(x);
					setPositionY(y);
					// Trigger move logic immediately on down
					const newSaturation = x * 100;
					setSaturation(newSaturation);
					const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
					const newLightness = topLightness * (1 - y);
					setLightness(newLightness);

					// We need to attach the window listeners
					// We can't reuse handlePointerMove directly because it depends on isDragging being true in closure
					// but we just set it true. 
					// So we rely on the effect to attach listeners when isDragging changes to true.
				}}
				ref={containerRef}
				style={{
					background: backgroundGradient,
				}}
				{...props}
			>
				<div
					className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
					style={{
						left: `${positionX * 100}%`,
						top: `${positionY * 100}%`,
						boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
					}}
				/>
			</div>
		);
	}
);

ColorPickerSelection.displayName = 'ColorPickerSelection';

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerHue = ({
	className,
	...props
}: ColorPickerHueProps) => {
	const { hue, setHue } = useColorPicker();

	return (
		<Slider.Root
			className={cn('relative flex h-4 w-full touch-none select-none items-center', className)}
			max={360}
			onValueChange={([h]) => setHue(h)}
			step={1}
			value={[hue || 0]}
			{...props}
		>
			<Slider.Track className="relative h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
				<Slider.Range className="absolute h-full" />
			</Slider.Track>
			<Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
		</Slider.Root>
	);
};

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerAlpha = ({
	className,
	...props
}: ColorPickerAlphaProps) => {
	const { alpha, setAlpha } = useColorPicker();

	return (
		<Slider.Root
			className={cn('relative flex h-4 w-full touch-none select-none items-center', className)}
			max={100}
			onValueChange={([a]) => setAlpha(a)}
			step={1}
			value={[alpha]}
			{...props}
		>
			<Slider.Track
				className="relative h-3 w-full grow rounded-full overflow-hidden"
				style={{
					background:
						'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
				}}
			>
				<div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />
				<Slider.Range className="absolute h-full" />
			</Slider.Track>
			<Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
		</Slider.Root>
	);
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
	className,
	...props
}: ColorPickerEyeDropperProps) => {
	const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

	const handleEyeDropper = async () => {
		try {
			// @ts-expect-error - EyeDropper API is experimental
			if (!window.EyeDropper) {
				console.warn("EyeDropper API not supported");
				return;
			}
			// @ts-expect-error - EyeDropper API is experimental
			const eyeDropper = new EyeDropper();
			const result = await eyeDropper.open();
			const color = Color(result.sRGBHex);
			setHue(color.hue());
			setSaturation(color.saturationl());
			setLightness(color.lightness());
			setAlpha(100);
		} catch (error) {
			console.error('EyeDropper failed:', error);
		}
	};

	return (
		<Button
			className={cn('shrink-0 text-muted-foreground', className)}
			onClick={handleEyeDropper}
			size="icon"
			variant="outline"
			type="button"
			{...props}
		>
			<PipetteIcon size={16} />
		</Button>
	);
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ['hex', 'rgb', 'css', 'hsl'];

export const ColorPickerOutput = ({
	className,
	...props
}: ColorPickerOutputProps) => {
	const { mode, setMode } = useColorPicker();

	return (
		<Select onValueChange={setMode} value={mode}>
			<SelectTrigger className="h-8 w-20 shrink-0 text-xs" {...props}>
				<SelectValue placeholder="Mode" />
			</SelectTrigger>
			<SelectContent>
				{formats.map((format) => (
					<SelectItem className="text-xs" key={format} value={format}>
						{format.toUpperCase()}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
	return (
		<div className="relative">
			<Input
				readOnly
				type="text"
				{...props}
				className={cn(
					'h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none',
					className
				)}
			/>
			<span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-xs">
				%
			</span>
		</div>
	);
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({
	className,
	...props
}: ColorPickerFormatProps) => {
	const { hue, saturation, lightness, alpha, mode } = useColorPicker();
	const color = Color.hsl(hue, saturation, lightness, alpha / 100);

	if (mode === 'hex') {
		const hex = color.hex();
		return (
			<div
				className={cn(
					'-space-x-px relative flex w-full items-center rounded-md shadow-sm',
					className
				)}
				{...props}
			>
				<Input
					className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
					readOnly
					type="text"
					value={hex}
				/>
				<PercentageInput value={alpha} />
			</div>
		);
	}

	if (mode === 'rgb') {
		const rgb = color
			.rgb()
			.array()
			.map((value) => Math.round(value));
		return (
			<div
				className={cn(
					'-space-x-px flex items-center rounded-md shadow-sm',
					className
				)}
				{...props}
			>
				{rgb.map((value, index) => (
					<Input
						className={cn(
							'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
							index && 'rounded-l-none',
							className
						)}
						key={index}
						readOnly
						type="text"
						value={value}
					/>
				))}
				<PercentageInput value={alpha} />
			</div>
		);
	}

	if (mode === 'css') {
		const rgb = color
			.rgb()
			.array()
			.map((value) => Math.round(value));
		return (
			<div className={cn('w-full rounded-md shadow-sm', className)} {...props}>
				<Input
					className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
					readOnly
					type="text"
					value={`rgba(${rgb.join(', ')}, ${alpha}%)`}
				/>
			</div>
		);
	}

	if (mode === 'hsl') {
		const hsl = color
			.hsl()
			.array()
			.map((value) => Math.round(value));
		return (
			<div
				className={cn(
					'-space-x-px flex items-center rounded-md shadow-sm',
					className
				)}
				{...props}
			>
				{hsl.map((value, index) => (
					<Input
						className={cn(
							'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
							index && 'rounded-l-none',
							className
						)}
						key={index}
						readOnly
						type="text"
						value={value}
					/>
				))}
				<PercentageInput value={alpha} />
			</div>
		);
	}

	return null;
};
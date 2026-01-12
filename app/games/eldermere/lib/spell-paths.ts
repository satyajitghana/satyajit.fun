export interface SpellPathPoint {
    x: number; // 0-1 (Screen coordinates relative to container)
    y: number; // 0-1
    isCheckpoint?: boolean;
    label?: string; // Key combination or instruction
}

export interface SpellPath {
    id: string;
    points: SpellPathPoint[];
    svgPath: string; // Smooth SVG path for visual
}

export const SPELL_PATHS: Record<string, SpellPath> = {
    basic_cast: {
        id: 'basic_cast',
        points: [
            { x: 0.2, y: 0.8, isCheckpoint: true, label: 'Start' },
            { x: 0.8, y: 0.2, isCheckpoint: true, label: 'Flick' }
        ],
        svgPath: "M 20 80 Q 50 50 80 20"
    },
    protego: {
        id: 'protego',
        points: [
            { x: 0.5, y: 0.8, isCheckpoint: true, label: 'Open Hand' },
            { x: 0.5, y: 0.5, isCheckpoint: false },
            { x: 0.5, y: 0.2, isCheckpoint: true, label: 'Close Fist!' }
        ],
        svgPath: "M 50 80 L 50 20"
    },
    incendio: {
        id: 'incendio',
        points: [
            { x: 0.2, y: 0.5, isCheckpoint: true },
            { x: 0.4, y: 0.3 },
            { x: 0.6, y: 0.7 },
            { x: 0.8, y: 0.5, isCheckpoint: true }
        ],
        svgPath: "M 20 50 Q 40 10 50 50 T 80 50"
    },
    accio: {
        id: 'accio',
        points: [
            { x: 0.5, y: 0.2, isCheckpoint: true, label: 'Reach' },
            { x: 0.5, y: 0.8, isCheckpoint: true, label: 'Pull' }
        ],
        svgPath: "M 50 20 L 50 80"
    },
    levioso: {
        id: 'levioso',
        points: [
            { x: 0.2, y: 0.8, isCheckpoint: true },
            { x: 0.5, y: 0.2, isCheckpoint: true, label: 'Lift' },
            { x: 0.8, y: 0.8, isCheckpoint: true }
        ],
        svgPath: "M 20 80 Q 50 0 80 80"
    },
    diffindo: {
        id: 'diffindo',
        points: [
             { x: 0.2, y: 0.2, isCheckpoint: true },
             { x: 0.8, y: 0.8, isCheckpoint: true, label: 'Slash' }
        ],
        svgPath: "M 20 20 L 80 80"
    },
    revelio: {
        id: 'revelio',
        points: [
            { x: 0.5, y: 0.5, isCheckpoint: true },
            { x: 0.8, y: 0.5 },
            { x: 0.5, y: 0.2 },
            { x: 0.2, y: 0.5 },
            { x: 0.5, y: 0.8 },
             { x: 0.8, y: 0.5, isCheckpoint: true }
        ],
        svgPath: "M 50 50 m -30, 0 a 30,30 0 1,0 60,0 a 30,30 0 1,0 -60,0"
    },
    depulso: {
        id: 'depulso',
        points: [
            { x: 0.5, y: 0.8, isCheckpoint: true, label: 'Charge' },
            { x: 0.5, y: 0.2, isCheckpoint: true, label: 'Push' }
        ],
        svgPath: "M 50 80 L 50 20"
    },
    descendo: {
        id: 'descendo',
        points: [
            { x: 0.5, y: 0.2, isCheckpoint: true, label: 'Raise' },
            { x: 0.5, y: 0.8, isCheckpoint: true, label: 'Slam' }
        ],
        svgPath: "M 50 20 L 50 80"
    },
    glacius: {
        id: 'glacius',
        points: [
            { x: 0.5, y: 0.2, isCheckpoint: true },
            { x: 0.8, y: 0.5, isCheckpoint: true },
            { x: 0.5, y: 0.8, isCheckpoint: true },
            { x: 0.2, y: 0.5, isCheckpoint: true },
            { x: 0.5, y: 0.2, isCheckpoint: true, label: 'Freeze' }
        ],
        svgPath: "M 50 20 L 80 50 L 50 80 L 20 50 Z" // Diamond shape
    },
    arresto_momentum: {
        id: 'arresto_momentum',
        points: [
            { x: 0.5, y: 0.5, isCheckpoint: true },
            { x: 0.7, y: 0.5, isCheckpoint: true },
            { x: 0.6, y: 0.3, isCheckpoint: true },
            { x: 0.4, y: 0.3, isCheckpoint: true },
            { x: 0.3, y: 0.5, isCheckpoint: true },
            { x: 0.5, y: 0.5, isCheckpoint: true }
        ],
        svgPath: "M 50 50 m 0,0 a 20,20 0 1,1 0,1 a 15,15 0 1,0 0,-1" // Spiral
    },
    bombarda: {
        id: 'bombarda',
        points: [
            { x: 0.5, y: 0.5, isCheckpoint: true },
            { x: 0.3, y: 0.3, isCheckpoint: true },
            { x: 0.7, y: 0.3, isCheckpoint: true },
            { x: 0.5, y: 0.5, isCheckpoint: true, label: 'Boom' }
        ],
        svgPath: "M 50 50 L 30 30 M 50 50 L 70 30 M 50 50 L 30 70 M 50 50 L 70 70" // Explosion lines
    },
    crucio: {
        id: 'crucio',
        points: [
            { x: 0.2, y: 0.2, isCheckpoint: true },
            { x: 0.8, y: 0.2, isCheckpoint: true },
            { x: 0.5, y: 0.8, isCheckpoint: true, label: 'Hold' }
        ],
        svgPath: "M 20 20 L 80 20 L 50 80" // Triangle
    },
    imperio: {
        id: 'imperio',
        points: [
            { x: 0.2, y: 0.5, isCheckpoint: true },
            { x: 0.8, y: 0.5, isCheckpoint: true },
            { x: 0.5, y: 0.2, isCheckpoint: true }
        ],
        svgPath: "M 20 50 L 80 50 M 50 20 L 50 80" // Cross
    },
    avada_kedavra: {
        id: 'avada_kedavra',
        points: [
            { x: 0.3, y: 0.1, isCheckpoint: true },
            { x: 0.7, y: 0.4, isCheckpoint: true },
            { x: 0.3, y: 0.7, isCheckpoint: true },
            { x: 0.7, y: 0.9, isCheckpoint: true, label: 'End' }
        ],
        svgPath: "M 30 10 L 70 40 L 30 70 L 70 90" // Lightning bolt
    }
};
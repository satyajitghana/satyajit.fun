# Entropy: An Experimental Game

## Core Concept
"Entropy" is a game about observing the player's relationship with control and chaos. There is no win condition. The "goal" is to experience the system's reaction to your presence. The game serves as a mirror to the player's intent.

## Mechanics
The core mechanic is interaction with a fluid simulation (`LiquidEther`).
The game tracks hidden metrics:
- **Stillness**: How much time the player spends not moving the cursor.
- **Chaos**: High velocity movements, rapid direction changes.
- **Persistence**: How long the session lasts.
- **Attempts**: Clicking or trying to "force" interaction.

## Visual Language (LiquidEther Adaptation)
The fluid simulation will shift its parameters based on the hidden metrics:
- **Calm/Observant Player**: The fluid becomes viscous, colors shift to cool blues/purples, flow becomes slow and rhythmic.
- **Chaotic/Aggressive Player**: The fluid becomes turbulent (high `dt`, low viscosity), colors shift to red/orange/white, distortion increases.
- **Bored/Quick Quitter**: If the player leaves quickly, the text reflects on their lack of patience.

## Endings
The game "ends" when the player decides to leave (clicks a "Leave" or "Back" button).
Upon exit, a modal or overlay presents a poetic summary of their behavior instead of a score.

### Archetypes (Possible Endings)
1.  **The Observer**: High Stillness, Medium Persistence.
    *   "You waited for the storm to pass. You found peace in the void."
2.  **The Catalyst**: High Chaos, High Activity.
    *   "You sought to break the silence. You are the fire that burns the world."
3.  **The Ghost**: Low Activity, Short Duration.
    *   "You were barely here. A whisper in a hurricane."
4.  **The Architect**: Balanced Activity, High Persistence.
    *   "You tried to build meaning where there was none. A noble, futile effort."

## Technical Implementation
- **State**: `zustand` store to track mouse movement, clicks, velocity, and time.
- **Visuals**: `LiquidEther` component with props driven by the store.
- **UI**: Minimalist. Just a "Back" button that triggers the ending sequence.
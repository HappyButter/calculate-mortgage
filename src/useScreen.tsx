import { useState, useEffect, useCallback } from 'react'

type Orientation = 'landscape' | 'portrait';

const getOrientation = (): Orientation =>
    window.screen.orientation.type
        .includes('landscape') ? 'landscape' : 'portrait';

const useScreen = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [orientation, setOrientation] = useState(getOrientation());

    const updateOrientation = useCallback(() => setOrientation(getOrientation()), []);

    useEffect(() => {
        window.addEventListener(
            'orientationchange',
            updateOrientation
        )
        window.addEventListener('resize', () => {
            setIsMobile(window.innerWidth < 768);
        });

        return () => {
            window.removeEventListener(
                'orientationchange',
                updateOrientation
            )
            window.removeEventListener('resize', () => {
                setIsMobile(window.innerWidth < 768);
            });
        }
    }, [])

    return { orientation, isMobile }
}

export default useScreen;
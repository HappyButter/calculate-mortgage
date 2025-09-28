import { useState, useRef, useEffect } from 'react';

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
    const [isHidden, setIsHidden] = useState(false);

    const expandIconRef = useRef<HTMLElement | null>(null);
    const sectionHeaderRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const toggleVisibility = () => {
        setIsHidden(prev => !prev);
    };

    useEffect(() => {
        expandIconRef.current?.classList.toggle('expand');
        sectionHeaderRef.current?.classList.toggle('collapsed');
        if (contentRef.current) {
            contentRef.current.style.maxHeight = isHidden ? '0px' : contentRef.current?.scrollHeight + "px";
            contentRef.current.ariaHidden = isHidden ? "true" : "false";
        }
    }, [isHidden])


    return (
        <section>
            <div className="section-header" ref={sectionHeaderRef}>
                <h3>{title}</h3>

                <span ref={expandIconRef} className="collapse expand" style={{ marginLeft: 'auto', marginBottom: '-6px', marginRight: '-8px' }} onClick={toggleVisibility}>
                    <svg width="24" height="24" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path d="M1650 288q0 13-10 23l-332 332 144 144q19 19 19 45t-19 45-45 19h-448q-26 0-45-19t-19-45v-448q0-26 19-45t45-19 45 19l144 144 332-332q10-10 23-10t23 10l114 114q10 10 10 23z" />
                        <path d="M896 960v448q0 26-19 45t-45 19-45-19l-144-144-332 332q-10 10-23 10t-23-10l-114-114q-10-10-10-23t10-23l332-332-144-144q-19-19-19-45t19-45 45-19h448q26 0 45 19t19 45z" />
                    </svg>
                </span>
            </div>

            <div className={'section-content'} ref={contentRef}>{children}</div>
        </section>
    );
};

export default Section;

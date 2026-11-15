import React from 'react';
import { IntroLogo } from './intro/IntroLogo';
import { IntroEditorial } from './intro/IntroEditorial';
import { IntroSplit } from './intro/IntroSplit';
import { IntroPlop } from './intro/IntroPlop';
import { IntroBottles } from './intro/IntroBottles';

export type IntroVariant = 'a' | 'b' | 'c' | 'd' | 'e';

/** Opening animation. Variant chosen by the shop owner (preview: ?intro=a|b|c). */
export const CurtainIntro: React.FC<{ variant?: IntroVariant; onOpen: () => void; onDone: () => void }> = ({ variant = 'e', ...p }) =>
  variant === 'e' ? <IntroBottles {...p} /> : variant === 'd' ? <IntroPlop {...p} /> : variant === 'b' ? <IntroEditorial {...p} /> : variant === 'c' ? <IntroSplit {...p} /> : <IntroLogo {...p} />;

export default CurtainIntro;

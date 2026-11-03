import React from 'react';
import './LimeMascot.scss';

/**
 * LimeMascot
 * Cute, expressive lime character mascot face inspired by Plopp/Duolingo style.
 * Features animated twinkling eyes, curved eyebrows, tuft of hair, and cute nose dots.
 */
const LimeMascot = ({ isPassword = false, mood = 'happy' }) => {
  return (
    <div className={`lime-mascot-container ${isPassword ? 'mascot-shy' : ''} mood-${mood}`}>
      {/* Hair tuft / leaf on top */}
      <div className="mascot-hair-tuft">
        <span className="tuft-blob left" />
        <span className="tuft-blob right" />
      </div>

      {/* Eyebrows */}
      <div className="mascot-eyebrows-row">
        <span className="mascot-eyebrow eyebrow-left" />
        <span className="mascot-eyebrow eyebrow-right" />
      </div>

      {/* Big cartoon eyes */}
      <div className="mascot-eyes-row">
        <div className="mascot-eye eye-left">
          <div className="eye-sclera">
            <div className="eye-pupil">
              <span className="eye-sparkle sparkle-large" />
              <span className="eye-sparkle sparkle-small" />
            </div>
          </div>
        </div>

        <div className="mascot-eye eye-right">
          <div className="eye-sclera">
            <div className="eye-pupil">
              <span className="eye-sparkle sparkle-large" />
              <span className="eye-sparkle sparkle-small" />
            </div>
          </div>
        </div>
      </div>

      {/* Cute nose dots */}
      <div className="mascot-nose-dots">
        <span className="nose-dot" />
        <span className="nose-dot" />
      </div>
    </div>
  );
};

export default LimeMascot;

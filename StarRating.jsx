import React, { useState, useRef, useEffect } from 'react';
import './StarRating.css';

const StarRating = ({ rating, setRating, maxStars = 5 }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const calculateRating = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    return isHalf ? index - 0.5 : index;
  };

  const handleClick = (e, index) => {
    setRating(calculateRating(e, index));
  };

  const handleMouseMove = (e, index) => {
    setHoverRating(calculateRating(e, index));
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  return (
    <div className="star-rating" onMouseLeave={handleMouseLeave}>
      {[...Array(maxStars)].map((_, i) => {
        const starIndex = i + 1;
        const currentRating = hoverRating || rating;
        
        let fillClass = 'empty';
        if (currentRating >= starIndex) {
          fillClass = 'full';
        } else if (currentRating === starIndex - 0.5) {
          fillClass = 'half';
        }
        
        return (
          <span
            key={i}
            className={`star ${fillClass}`}
            onClick={(e) => handleClick(e, starIndex)}
            onMouseMove={(e) => handleMouseMove(e, starIndex)}
          >
            ★
          </span>
        );
      })}
      <span className="rating-value">{hoverRating || rating}</span>
    </div>
  );
};

export default StarRating;

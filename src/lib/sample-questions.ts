
export interface SampleQuestion {
  questionNumber: number;
  questionText: string;
  questionType: "Long Answer" | "Short Answer" | "Numerical Problem" | "Derivation";
  marks: 2 | 3 | 5;
  difficulty: "Medium" | "Hard";
  keyConceptsTested: string[];
  isPYQ: boolean;
  pyqYear?: number;
  correctAnswerPoints: string[];
  fullAnswerCBSE: string;
  commonMistakes: string[];
}

export const sampleQuestions: SampleQuestion[] = [
  {
    questionNumber: 1,
    questionText: "State and prove Gauss's Law in electrostatics. Apply it to find the electric field due to an infinitely long straight uniformly charged wire. The linear charge density is $λ$.",
    questionType: "Derivation",
    marks: 5,
    difficulty: "Hard",
    keyConceptsTested: ["Gauss's Law", "Electric Flux", "Cylindrical Symmetry", "Linear Charge Density"],
    isPYQ: true,
    pyqYear: 2023,
    correctAnswerPoints: [
      "Statement of Gauss's Law: Total electric flux through a closed surface is $1/ε₀$ times the net charge enclosed.",
      "Proof using solid angle concept or by considering a point charge.",
      "Construction of a cylindrical Gaussian surface around the wire.",
      "Calculation of flux through the top, bottom, and curved surfaces.",
      "Applying Gauss's Law: $E * 2πrl = λl / ε₀$.",
      "Final expression: $E = λ / (2πε₀r)$."
    ],
    fullAnswerCBSE: `**Gauss's Law Statement:**
The total electric flux (Φ) through any closed surface (Gaussian surface) is equal to 1/ε₀ times the net charge (q_enclosed) enclosed by the surface.
Mathematically: Φ = ∮ E ⋅ dA = q_enclosed / ε₀

**Proof:** (Proof for a point charge)
... (Detailed proof steps) ...

**Electric field due to an infinitely long straight charged wire:**
1.  **Gaussian Surface:** Consider a cylindrical Gaussian surface of radius 'r' and length 'l' coaxial with the wire.
2.  **Symmetry:** By symmetry, the electric field E is radial and has the same magnitude at all points on the curved surface. The electric field is perpendicular to the circular end caps.
3.  **Flux Calculation:**
    *   Flux through top and bottom circular ends is zero as E is perpendicular to dA (θ = 90°, cos(90°) = 0).
    *   Flux through the curved surface: Φ = E * (Area of curved surface) = E * (2πrl).
4.  **Charge Enclosed:** If λ is the linear charge density, the charge enclosed is q_enclosed = λl.
5.  **Applying Gauss's Law:**
    E * (2πrl) = λl / ε₀
    => E = λ / (2πε₀r)
    The direction of the electric field is radially outward for a positively charged wire.`,
    commonMistakes: [
      "Forgetting to mention that the law applies to a *closed* surface.",
      "Incorrectly calculating the flux through the circular end caps of the cylinder.",
      "Using the wrong formula for the area of the curved surface.",
      "Mistake in the final expression, like missing 'r' in the denominator."
    ]
  },
  {
    questionNumber: 2,
    questionText: "Define electric potential. Derive an expression for the electric potential at a point due to an electric dipole of dipole moment $p$ along its axial line.",
    questionType: "Derivation",
    marks: 3,
    difficulty: "Medium",
    keyConceptsTested: ["Electric Potential", "Electric Dipole", "Superposition Principle"],
    isPYQ: true,
    pyqYear: 2022,
    correctAnswerPoints: [
      "Definition of electric potential: Work done per unit positive charge to bring it from infinity to that point.",
      "Diagram of an electric dipole and a point P on the axial line.",
      "Potential at P due to +q: $V₁ = k * q / (r - a)$",
      "Potential at P due to -q: $V₂ = k * (-q) / (r + a)$",
      "Net potential $V = V₁ + V₂$ using superposition.",
      "Final expression for short dipole (r >> a): $V = k * p / r²$",
    ],
    fullAnswerCBSE: `**Electric Potential Definition:**
Electric potential at a point in an electric field is defined as the work done in moving a unit positive charge from infinity to that point without acceleration. It is a scalar quantity.

**Potential due to a dipole on its axial line:**
... (Diagram showing dipole and point P) ...
Let the point P be at a distance 'r' from the center of the dipole.
Potential due to charge +q at B: $V₁ = (1/4πε₀) * q / (r - a)$
Potential due to charge -q at A: $V₂ = (1/4πε₀) * (-q) / (r + a)$

By the superposition principle, the net potential at P is:
$V = V₁ + V₂$
$V = (q/4πε₀) * [ 1/(r - a) - 1/(r + a) ]$
$V = (q/4πε₀) * [ (r + a - (r - a)) / (r² - a²) ]$
$V = (q/4πε₀) * [ 2a / (r² - a²) ]$
Since dipole moment p = q * 2a,
$V = (1/4πε₀) * p / (r² - a²)$

**For a short dipole (r >> a):**
a² can be neglected compared to r².
$V = (1/4πε₀) * p / r²$`,
    commonMistakes: [
      "Incorrect signs for potential due to positive and negative charges.",
      "Errors in algebraic simplification.",
      "Forgetting the condition for a short dipole (r >> a).",
    ],
  },
  // Add 8 more sample questions here...
  {
    questionNumber: 3,
    questionText: "Explain the principle of a potentiometer. How can it be used to compare the EMFs of two primary cells, $E_1$ and $E_2$?",
    questionType: "Long Answer",
    marks: 5,
    difficulty: "Hard",
    keyConceptsTested: ["Potentiometer Principle", "EMF Comparison", "Null Deflection"],
    isPYQ: false,
    correctAnswerPoints: [
      "Principle: Potential drop across any portion of a uniform wire is directly proportional to the length of that portion, provided the current is constant.",
      "Circuit diagram for comparing EMFs of two cells (E1 and E2).",
      "Explanation of the procedure: First connect cell E1, find the balancing length $l_1$. So, $E_1 = k * l_1$.",
      "Then connect cell E2, find the new balancing length $l_2$. So, $E_2 = k * l_2$.",
      "Derivation of the ratio: $E_1 / E_2 = l_1 / l_2$.",
      "Mentioning necessary precautions like the driver cell's EMF must be greater than the cells to be compared."
    ],
    fullAnswerCBSE: `**Principle of Potentiometer:**
A potentiometer works on the principle that the potential drop across any length of a wire of uniform cross-section and composition is directly proportional to its length, when a constant current flows through it.
$V ∝ l$  => $V = kl$, where k is the potential gradient.

**Comparing EMFs of two cells:**
... (Circuit Diagram) ...
1. The primary circuit is closed with key K. A constant current flows through the potentiometer wire.
2. Cell E1 is introduced into the secondary circuit. The jockey is moved along the wire AB to find the null point (zero deflection in galvanometer). Let the balancing length be AJ = l1.
   At this point, the potential drop across AJ is equal to the EMF of cell E1.
   $E_1 = k * l_1$  ---(i)
3. Now, cell E1 is replaced by cell E2. Without changing the primary circuit, the new balancing length AJ' = l2 is found.
   $E_2 = k * l_2$  ---(ii)
4. Dividing equation (i) by (ii):
   $E_1 / E_2 = (k * l_1) / (k * l_2)$
   $E_1 / E_2 = l_1 / l_2$
By measuring the balancing lengths l1 and l2, the EMFs of the two cells can be compared.`,
    commonMistakes: [
        "Incorrect circuit diagram.",
        "Stating V=IR instead of the potential drop principle.",
        "Forgetting to mention that the current in the primary circuit must remain constant.",
    ]
  },
  {
    questionNumber: 4,
    questionText: "What is self-induction? Derive an expression for the self-inductance $L$ of a long solenoid.",
    questionType: "Derivation",
    marks: 3,
    difficulty: "Medium",
    keyConceptsTested: ["Self-Induction", "Magnetic Flux", "Solenoid", "Inductance"],
    isPYQ: true,
    pyqYear: 2021,
    correctAnswerPoints: [
      "Definition of self-induction: Property of a coil to oppose any change in the current flowing through it.",
      "Magnetic field inside a long solenoid: $B = μ₀nI$, where n is turns per unit length.",
      "Magnetic flux through one turn: $Φ_{turn} = B * A = μ₀nIA$.",
      "Total flux through N turns: $Φ_{total} = N * Φ_{turn} = (nl) * (μ₀nIA)$.",
      "Using the relation $Φ = LI$, we get $L = μ₀n²Al$.",
      "Final expression $L = μ₀N²A / l$."
    ],
    fullAnswerCBSE: `**Self-Induction:**
Self-induction is the property of a coil by virtue of which it opposes any change in the strength of the current flowing through it by inducing an EMF in itself. This is also known as the inertia of electricity.

**Self-inductance of a long solenoid:**
Consider a long solenoid of length 'l', cross-sectional area 'A', and 'N' total turns. The number of turns per unit length is $n = N/l$.
1. The magnetic field inside the solenoid when a current 'I' flows through it is given by $B = μ₀nI$.
2. The magnetic flux linked with each turn is $Φ_{turn} = B * A = (μ₀nI) * A$.
3. The total magnetic flux linked with the entire solenoid (N turns) is:
   $Φ_{total} = N * Φ_{turn} = (nl) * (μ₀nIA) = μ₀n²AlI$.
4. By definition of self-inductance, $Φ_{total} = LI$.
5. Comparing the two expressions for total flux:
   $LI = μ₀n²AlI$
   => $L = μ₀n²Al$
   Since $n = N/l$, we can also write $L = μ₀(N/l)²Al = μ₀N²A / l$.`,
    commonMistakes: [
      "Confusing self-induction with mutual induction.",
      "Using the wrong formula for the magnetic field of a solenoid.",
      "Error in distinguishing between N (total turns) and n (turns per unit length).",
    ]
  },
  {
    questionNumber: 5,
    questionText: "Describe the working of a full-wave rectifier with a neat circuit diagram. Also, draw its input and output waveforms.",
    questionType: "Long Answer",
    marks: 5,
    difficulty: "Medium",
    keyConceptsTested: ["Rectification", "p-n Junction Diode", "Center-tapped Transformer", "Waveforms"],
    isPYQ: true,
    pyqYear: 2020,
    correctAnswerPoints: [
      "Circuit diagram showing a center-tapped transformer, two diodes (D1, D2), and a load resistor (RL).",
      "Working during the positive half-cycle of AC input: Diode D1 is forward biased, D2 is reverse biased. Current flows through RL.",
      "Working during the negative half-cycle of AC input: Diode D2 is forward biased, D1 is reverse biased. Current flows through RL in the same direction.",
      "Explanation that current flows through the load resistor in the same direction for both halves of the cycle, resulting in a unidirectional output.",
      "Correct drawing of sinusoidal input waveform.",
      "Correct drawing of the full-wave rectified pulsating DC output waveform.",
    ],
    fullAnswerCBSE: `**Full-Wave Rectifier:**
A full-wave rectifier is a device that converts the entire cycle of an alternating current (AC) into a pulsating direct current (DC).

**Circuit Diagram:**
... (Diagram of a center-tapped full-wave rectifier) ...

**Working:**
1.  **Positive Half-Cycle:** During the positive half-cycle of the input AC signal, the end 'A' of the secondary coil is positive and 'B' is negative. Diode D1 becomes forward-biased and conducts, while diode D2 is reverse-biased and does not conduct. The current flows through D1 and the load resistor RL from P to Q.
2.  **Negative Half-Cycle:** During the negative half-cycle, the end 'A' becomes negative and 'B' becomes positive. Diode D2 is now forward-biased and conducts, while D1 is reverse-biased. The current flows through D2 and the load resistor RL, again from P to Q.

In both half-cycles, the current through the load resistor RL flows in the same direction. Thus, a unidirectional, pulsating DC output is obtained across the load.

**Input and Output Waveforms:**
... (Drawings of input AC sine wave and output full-wave rectified DC pulses) ...`,
    commonMistakes: [
      "Incorrectly biasing the diodes during the half-cycles.",
      "Showing the current direction changing in the load resistor.",
      "Drawing the output waveform as a flat DC line instead of pulsating DC.",
      "Omitting the center-tapped transformer from the diagram."
    ]
  },
  {
    questionNumber: 6,
    questionText: "What are eddy currents? Write any two applications of eddy currents.",
    questionType: "Short Answer",
    marks: 2,
    difficulty: "Medium",
    keyConceptsTested: ["Eddy Currents", "Electromagnetic Damping", "Induction Furnace"],
    isPYQ: true,
    pyqYear: 2024,
    correctAnswerPoints: [
        "Definition: Eddy currents are loops of electric current induced within conductors by a changing magnetic field in the conductor, according to Faraday's law of induction.",
        "Application 1: Magnetic braking in trains.",
        "Application 2: Induction furnace for melting metals.",
        "Application 3: Electromagnetic damping in galvanometers.",
    ],
    fullAnswerCBSE: `**Eddy Currents:**
Eddy currents are circulating currents induced in a bulk piece of a conductor when it is subjected to a changing magnetic field. These currents flow in closed loops within the conductor, in planes perpendicular to the magnetic field, and their direction is given by Lenz's law.

**Applications of Eddy Currents (any two):**
1.  **Magnetic Braking in Trains:** Strong electromagnets are situated above the rails. When activated, they induce large eddy currents in the moving rails. According to Lenz's law, these currents oppose the motion of the train, providing a smooth and efficient braking system without physical contact.
2.  **Induction Furnace:** High-frequency alternating current is passed through a coil surrounding the metals to be melted. This produces a rapidly changing magnetic field, inducing large eddy currents in the metals. The high amount of heat ($I²R$) produced by these currents is sufficient to melt the metal.`,
    commonMistakes: [
        "Confusing eddy currents with displacement currents.",
        "Giving vague applications without explaining the principle behind them.",
    ]
  },
   {
    questionNumber: 7,
    questionText: "Derive the lens maker's formula for a thin double convex lens. State the assumptions made.",
    questionType: "Derivation",
    marks: 5,
    difficulty: "Hard",
    keyConceptsTested: ["Refraction at Spherical Surfaces", "Lens Maker's Formula", "Sign Convention"],
    isPYQ: true,
    pyqYear: 2022,
    correctAnswerPoints: [
      "Statement of assumptions: Lens is thin, aperture is small, object is a point object on the principal axis.",
      "Diagram showing refraction at two surfaces of a convex lens.",
      "Applying the formula for refraction at the first surface (ABC): $n₂/v₁ - n₁/u = (n₂ - n₁)/R₁$.",
      "Applying the formula for refraction at the second surface (ADC), treating the first image as the object: $n₁/v - n₂/v₁ = (n₁ - n₂)/R₂$.",
      "Adding the two equations to eliminate the intermediate image distance v₁.",
      "Using the lens formula $1/f = (n₂/n₁ - 1) * (1/R₁ - 1/R₂)$, where $n = n₂/n₁$.",
    ],
    fullAnswerCBSE: `**Assumptions:**
1. The lens is thin, so the thickness is negligible.
2. The aperture of the lens is small.
3. The object is a point object placed on the principal axis.
4. The incident and refracted rays make small angles with the principal axis.

**Derivation:**
... (Diagram showing a thin convex lens with radii R1 and R2, refractive index n2, placed in a medium of refractive index n1) ...

**1. Refraction at the first surface (ABC):**
The light ray from object O refracts and would form an image I₁ if the second surface were absent.
Using the formula for refraction at a spherical surface:
$n₂/v₁ - n₁/u = (n₂ - n₁)/R₁$   ---(i)

**2. Refraction at the second surface (ADC):**
The image I₁ acts as a virtual object for the second surface, forming the final image I at distance v.
$n₁/v - n₂/v₁ = (n₁ - n₂)/R₂$   ---(ii)

**3. Combining the equations:**
Adding (i) and (ii):
$n₁/v - n₁/u = (n₂ - n₁) * (1/R₁ - 1/R₂)$
Dividing by n₁:
$1/v - 1/u = (n₂/n₁ - 1) * (1/R₁ - 1/R₂)$

When the object is at infinity (u = ∞), the image is formed at the focal point (v = f).
$1/f - 1/∞ = (n₂/n₁ - 1) * (1/R₁ - 1/R₂)$
Therefore, **$1/f = (n - 1) * (1/R₁ - 1/R₂)$**, where $n = n₂/n₁$.
This is the Lens Maker's Formula.`,
    commonMistakes: [
      "Incorrect sign convention for u, v, R₁, or R₂.",
      "Errors in the formula for refraction at a single spherical surface.",
      "Mistake in algebraic addition of the two equations.",
      "Forgetting to state the assumptions clearly."
    ]
  },
  {
    questionNumber: 8,
    questionText: "What is meant by binding energy per nucleon? Draw the binding energy curve and explain the inference about nuclear stability, fission and fusion from it.",
    questionType: "Long Answer",
    marks: 5,
    difficulty: "Hard",
    keyConceptsTested: ["Binding Energy", "Mass Defect", "Nuclear Stability", "Fission", "Fusion"],
    isPYQ: false,
    correctAnswerPoints: [
      "Definition: Binding energy per nucleon is the average energy required to remove one nucleon from the nucleus.",
      "Drawing the binding energy per nucleon vs. mass number curve, showing the peak around Fe-56.",
      "Stability Inference: Nuclei with higher binding energy per nucleon are more stable. The peak of the curve (around A=56) corresponds to the most stable nuclei.",
      "Fission Inference: A heavy nucleus (e.g., Uranium, A > 200) has lower binding energy per nucleon. If it splits into two lighter nuclei, the products have higher binding energy per nucleon, releasing energy.",
      "Fusion Inference: Very light nuclei (e.g., Hydrogen, A < 20) have low binding energy per nucleon. If they fuse to form a heavier nucleus, the product has a higher binding energy per nucleon, releasing a large amount of energy.",
    ],
    fullAnswerCBSE: `**Binding Energy Per Nucleon (BE/A):**
The binding energy per nucleon is the average energy required to extract one nucleon (proton or neutron) from a nucleus. It is a measure of the stability of a nucleus. It is calculated by dividing the total binding energy of a nucleus by its mass number (A).

**Binding Energy Curve:**
... (A graph of Binding Energy per Nucleon (in MeV) on the y-axis vs. Mass Number (A) on the x-axis, showing the characteristic shape with a peak near Iron) ...

**Inferences from the Curve:**
1.  **Nuclear Stability:** The higher the binding energy per nucleon, the more stable the nucleus. The curve peaks at a mass number A ≈ 56 (Iron), which means that iron and nuclei near it are the most stable in nature.
2.  **Nuclear Fission:** For nuclei with mass numbers greater than about 200 (e.g., Uranium), the binding energy per nucleon is lower than that for nuclei in the middle of the curve. When a heavy nucleus splits (fission) into two or more lighter nuclei, the daughter nuclei have a higher binding energy per nucleon. This increase in binding energy is released as a large amount of energy.
3.  **Nuclear Fusion:** For very light nuclei (with A < 20, e.g., Hydrogen isotopes), the binding energy per nucleon is very low. When these light nuclei combine (fuse) to form a heavier nucleus, the resulting nucleus has a higher binding energy per nucleon. This process also results in the release of a tremendous amount of energy, as seen in stars and hydrogen bombs.`,
    commonMistakes: [
      "Incorrectly drawing the binding energy curve.",
      "Confusing total binding energy with binding energy per nucleon.",
      "Explaining fission as light nuclei splitting, or fusion as heavy nuclei combining.",
      "Unable to clearly link the release of energy to the increase in binding energy per nucleon."
    ]
  },
   {
    questionNumber: 9,
    questionText: "Using Huygens' principle, prove the laws of reflection. Let the angle of incidence be $i$ and angle of reflection be $r$.",
    questionType: "Derivation",
    marks: 3,
    difficulty: "Medium",
    keyConceptsTested: ["Huygens' Principle", "Wavefronts", "Laws of Reflection"],
    isPYQ: true,
    pyqYear: 2021,
    correctAnswerPoints: [
      "Statement of Huygens' Principle: Each point on a wavefront is a source of secondary wavelets.",
      "Diagram showing a plane wavefront incident on a reflecting surface.",
      "Geometric proof using congruent triangles (ΔAEC and ΔABC). Show that AC is common, $BC = AE = vt$, and $∠ABC = ∠AEC = 90°$.",
      "Conclusion from congruent triangles that $∠BAC = ∠ECA$, which implies angle of incidence ($i$) = angle of reflection ($r$).",
      "Stating that the incident wavefront, reflected wavefront, and the normal all lie in the same plane."
    ],
    fullAnswerCBSE: `**Huygens' Principle:**
1.  Every point on a given wavefront acts as a fresh source of new disturbances, called secondary wavelets.
2.  The secondary wavelets spread out in all directions with the speed of the wave.
3.  The new wavefront at any later time is the forward envelope of the secondary wavelets at that time.

**Proof of Laws of Reflection:**
... (Diagram showing incident wavefront AB on a reflecting surface XY, and reflected wavefront EC) ...
Let a plane wavefront AB be incident on a reflecting surface XY. Let 'v' be the speed of the wave.
In the time 't' it takes for the disturbance to travel from B to C, the secondary wavelet from A will have travelled a distance $AE = vt$, where AE is a sphere of radius vt. The tangent plane CE to this sphere represents the reflected wavefront.

In triangles ΔABC and ΔAEC:
1.  $AE = BC = vt$ (distance travelled by the wave in time t)
2.  AC is common to both triangles.
3.  $∠ABC = ∠AEC = 90°$ (The wavefronts are perpendicular to the direction of propagation)

Therefore, by RHS congruence, ΔABC ≅ ΔAEC.
This implies that $∠BAC = ∠ECA$.
Here, $∠BAC$ = angle of incidence ($i$) and $∠ECA$ = angle of reflection ($r$).
Hence, **$i = r$**. This is the first law of reflection.

Also, the incident wavefront (AB), the reflecting surface (XY), and the reflected wavefront (EC) are all perpendicular to the plane of the paper. Thus, the incident ray, the reflected ray, and the normal at the point of incidence all lie in the same plane. This is the second law of reflection.`,
    commonMistakes: [
      "Incorrect diagram, especially the direction of reflected wavefront.",
      "Failing to use congruent triangles to prove i=r.",
      "Confusing rays with wavefronts in the proof.",
    ]
  },
  {
    questionNumber: 10,
    questionText: "What is photoelectric effect? Write Einstein's photoelectric equation and explain the terms. Explain how it explains the laws of photoelectric emission.",
    questionType: "Long Answer",
    marks: 5,
    difficulty: "Medium",
    keyConceptsTested: ["Photoelectric Effect", "Work Function", "Threshold Frequency", "Photon"],
    isPYQ: false,
    correctAnswerPoints: [
      "Definition of photoelectric effect: Emission of electrons from a metal surface when light of suitable frequency is incident on it.",
      "Einstein's Photoelectric Equation: $K_{max} = hν - φ₀$, where $K_{max}$ is max kinetic energy, $hν$ is photon energy, and $φ₀$ is work function.",
      "Explanation of terms: h (Planck's constant), ν (frequency), φ₀ (minimum energy to eject an electron).",
      "Explanation of threshold frequency: If $hν < φ₀$, no emission occurs, hence $ν$ must be $> φ₀/h$.",
      "Explanation of instantaneous emission: Photon absorption is an instantaneous process, there is no time lag.",
      "Explanation of intensity: Higher intensity means more photons, leading to more electron emissions (higher current), but not higher kinetic energy.",
    ],
    fullAnswerCBSE: `**Photoelectric Effect:**
The photoelectric effect is the phenomenon of emission of electrons from a metal surface when electromagnetic radiation (like light) of sufficiently high frequency is incident on it.

**Einstein's Photoelectric Equation:**
Einstein proposed that light consists of packets of energy called photons. The energy of each photon is $E = hν$. When a photon of energy hν strikes a metal surface, a part of its energy is used to overcome the work function (φ₀) of the metal, and the rest is given to the emitted electron as maximum kinetic energy (K_max).
The equation is:
**$K_{max} = hν - φ₀$**
or **$(1/2)mv_{max}² = hν - hν₀$**
where:
*   **$K_{max}$:** Maximum kinetic energy of the emitted photoelectron.
*   **h:** Planck's constant.
*   **ν:** Frequency of the incident radiation.
*   **φ₀:** Work function of the metal (minimum energy required to eject an electron).
*   **ν₀:** Threshold frequency (minimum frequency for emission).

**Explanation of the Laws of Photoelectric Emission:**
1.  **Existence of Threshold Frequency:** If the frequency ν of the incident light is less than the threshold frequency ν₀ (i.e., $hν < φ₀$), the kinetic energy K_max would be negative, which is impossible. Thus, no photoelectric emission occurs below the threshold frequency.
2.  **Kinetic Energy and Frequency:** From the equation, $K_{max} ∝ ν$. The maximum kinetic energy of photoelectrons is directly proportional to the frequency of incident radiation and is independent of its intensity.
3.  **Intensity and Photocurrent:** The intensity of light is proportional to the number of photons incident per unit area per unit time. A higher intensity means more photons, which will eject more electrons from the metal. This results in a higher photoelectric current.
4.  **Instantaneous Process:** The photoelectric effect is an instantaneous process. The absorption of a photon by an electron is a single-event process, so there is no time lag between the incidence of light and the emission of photoelectrons.`,
    commonMistakes: [
      "Defining the effect without mentioning 'suitable frequency'.",
      "Incorrectly writing the photoelectric equation (e.g., wrong signs).",
      "Stating that kinetic energy depends on intensity.",
      "Unable to explain why the process is instantaneous.",
    ]
  }
]

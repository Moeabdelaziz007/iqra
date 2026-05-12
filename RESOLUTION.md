# Testing Improvement & Topology Resiliency

1. **Philosophy Unit Test**
   - Added unit test to verify core IQRA constants (`TAWAKKUL`, `DASTUR`, etc.)
   - Checked output definitions to ensure proper export from `#core/constants.ts`

2. **Topology Resilience**
   - Eliminated macOS specific `execSync` (`ps -A`, `sysctl vm.loadavg`) inside `lib/iqra/10-topology/topology.ts`.
   - Used Node's native cross-platform functions (`os.freemem()`, `os.loadavg()`).

3. **Shannon Entropy (H_EL)**
   - Replaced mathematical bugs causing Shannon tests to fail. Added proper string normalization (diacritics and Arabic spaces).

4. **Integration Map Fixes**
   - Resolved wrong URL imports mapping for internal TS libraries like `#core`, `#memory` during the test runner loop.

Done.

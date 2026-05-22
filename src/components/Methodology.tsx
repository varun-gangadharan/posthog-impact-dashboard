export default function Methodology() {
  return (
    <section className="methodology-panel" aria-label="Methodology">
      <h2>Methodology</h2>
      <p>
        Scores combine delivery, product impact, leverage, and quality signals from public
        PostHog GitHub activity. The dashboard is designed for focused exploration, not stack
        ranking or performance evaluation.
      </p>
      <ul>
        <li>Delivery reflects merged work and volume-adjusted contribution signals.</li>
        <li>Product and repo area labels come from the classification pipeline.</li>
        <li>Evidence links are restricted to public PostHog GitHub PRs and issues.</li>
      </ul>
    </section>
  );
}

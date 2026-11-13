class HeuristicRanker:
    def __init__(self, weights=None):
        self.weights = weights or {"cf": 0.4, "vector": 0.4, "pop": 0.2} 

    def score(self, cf_score, vec_score, pop_score):
        return (
            self.weights["cf"] * cf_score +
            self.weights["vector"] * vec_score +
            self.weights["pop"] * pop_score
        )

    def rank(self, candidates):
        return sorted(
            candidates,
            key=lambda x: x["score"],
            reverse=True
        )
<?php

declare(strict_types=1);

namespace App\Models;

class Magazine extends LibraryItem
{
    public string $issueNumber;
    public string $publisher;

    public function __construct(int $id, string $title, int $publicationYear, string $issueNumber, string $publisher, bool $isAvailable = true)
    {
        parent::__construct($id, $title, $publicationYear, $isAvailable);
        $this->issueNumber = $issueNumber;
        $this->publisher = $publisher;
    }

    public function getItemDetails(): string
    {
        return sprintf("Magazine: %s (%s) — Issue: %s", $this->title, $this->publicationYear, $this->issueNumber);
    }
}

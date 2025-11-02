<?php

declare(strict_types=1);

namespace App\Models;

class Transaction
{
    public int $transactionId;
    public int $userId;
    public int $itemId;
    public string $action;
    public \DateTime $timestamp;
    public ?\DateTime $dueDate = null;
}
